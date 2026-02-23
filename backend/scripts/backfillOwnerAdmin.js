const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const { recordMigrationRun } = require('../utils/migrationRegistry');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const pickTargetAdminEmail = () => {
    const arg = process.argv.find((item) => item.startsWith('--adminEmail='));
    if (arg) {
        return normalizeEmail(arg.split('=').slice(1).join('='));
    }
    return normalizeEmail(process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '');
};

const main = async () => {
    const startedAt = new Date();
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGO_URI is required');
    }

    await mongoose.connect(mongoUri);
    try {
        const admins = await User.find({ role: 'admin' }).select('_id ownerAdmin email').lean();
        if (!admins.length) {
            throw new Error('No admin users found');
        }

        let adminSelfFixCount = 0;
        for (const admin of admins) {
            if (!admin.ownerAdmin || String(admin.ownerAdmin) !== String(admin._id)) {
                // eslint-disable-next-line no-await-in-loop
                await User.updateOne({ _id: admin._id }, { $set: { ownerAdmin: admin._id } });
                adminSelfFixCount += 1;
            }
        }

        const targetAdminEmail = pickTargetAdminEmail();
        if (!targetAdminEmail) {
            throw new Error('Target admin email missing. Set SUPER_ADMIN_EMAIL or pass --adminEmail=<email>');
        }

        const targetAdmin = await User.findOne({
            role: 'admin',
            email: targetAdminEmail
        }).select('_id email').lean();
        if (!targetAdmin) {
            throw new Error(`Admin not found for ${targetAdminEmail}`);
        }

        const unassignedFilter = {
            role: { $ne: 'admin' },
            $or: [{ ownerAdmin: null }, { ownerAdmin: { $exists: false } }]
        };
        const unassignedCount = await User.countDocuments(unassignedFilter);
        const assignResult = await User.updateMany(
            unassignedFilter,
            { $set: { ownerAdmin: targetAdmin._id } }
        );
        const summary = {
            adminSelfFixCount,
            unassignedCount,
            assignedCount: assignResult.modifiedCount || 0,
            targetAdminEmail: targetAdmin.email
        };

        console.log('OwnerAdmin backfill completed');
        console.log(`Admin self-heal updates: ${adminSelfFixCount}`);
        console.log(`Unassigned users before update: ${unassignedCount}`);
        console.log(`Users assigned to ${targetAdmin.email}: ${assignResult.modifiedCount || 0}`);
        await recordMigrationRun({
            scriptName: 'backfillOwnerAdmin',
            mode: 'apply',
            applied: true,
            summary,
            startedAt,
            finishedAt: new Date()
        });
    } finally {
        await mongoose.disconnect();
    }
};

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
