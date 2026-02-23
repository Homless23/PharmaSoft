const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Bill = require('../models/Bill');
const Transaction = require('../models/Transaction');
const { recordMigrationRun } = require('../utils/migrationRegistry');

const hasFlag = (flag) => process.argv.includes(flag);
const getArgValue = (key) => {
    const hit = process.argv.find((item) => item.startsWith(`${key}=`));
    if (!hit) return '';
    return String(hit.split('=').slice(1).join('=') || '').trim();
};

const shouldApply = hasFlag('--apply');
const includeBills = !hasFlag('--skip-bills');
const includeTransactions = !hasFlag('--skip-transactions');
const targetAdminId = getArgValue('--adminId');

const buildOwnerMap = (users) => {
    const map = new Map();
    for (const user of users) {
        const userId = String(user?._id || '');
        if (!userId) continue;
        if (String(user?.role || '').toLowerCase() === 'admin') {
            map.set(userId, userId);
            continue;
        }
        const ownerId = String(user?.ownerAdmin || '').trim();
        if (ownerId) {
            map.set(userId, ownerId);
        }
    }
    return map;
};

const shouldMigrateUser = (userId, ownerId) => userId && ownerId && userId !== ownerId;

const migrateTransactions = async ({ userId, ownerId, apply }) => {
    const count = await Transaction.countDocuments({ user: userId });
    if (!count) return { matched: 0, migrated: 0 };
    if (!apply) return { matched: count, migrated: 0 };
    const result = await Transaction.updateMany({ user: userId }, { $set: { user: ownerId } });
    return {
        matched: count,
        migrated: Number(result.modifiedCount || 0)
    };
};

const migrateBills = async ({ userId, ownerId, apply }) => {
    const rows = await Bill.find({ user: userId }).select('_id billNumber').lean();
    if (!rows.length) return { matched: 0, migrated: 0, skippedConflict: 0 };
    if (!apply) return { matched: rows.length, migrated: 0, skippedConflict: 0 };

    let migrated = 0;
    let skippedConflict = 0;
    for (const row of rows) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const result = await Bill.updateOne(
                { _id: row._id, user: userId },
                { $set: { user: ownerId } },
                { allowSensitiveBillUpdate: true }
            );
            if (Number(result.modifiedCount || 0) > 0) {
                migrated += 1;
            }
        } catch (error) {
            if (Number(error?.code) === 11000) {
                skippedConflict += 1;
                continue;
            }
            throw error;
        }
    }

    return {
        matched: rows.length,
        migrated,
        skippedConflict
    };
};

const main = async () => {
    const startedAt = new Date();
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGO_URI is required');
    }
    if (!includeBills && !includeTransactions) {
        throw new Error('Nothing to migrate. Remove --skip-bills or --skip-transactions.');
    }

    await mongoose.connect(mongoUri);
    try {
        const userFilter = targetAdminId
            ? { $or: [{ _id: targetAdminId }, { ownerAdmin: targetAdminId }] }
            : {};
        const users = await User.find(userFilter).select('_id role ownerAdmin').lean();
        const ownerMap = buildOwnerMap(users);

        const migrationPairs = [];
        for (const [userId, ownerId] of ownerMap.entries()) {
            if (shouldMigrateUser(userId, ownerId)) {
                migrationPairs.push({ userId, ownerId });
            }
        }

        const summary = {
            mode: shouldApply ? 'apply' : 'dry-run',
            usersScanned: users.length,
            usersToMigrate: migrationPairs.length,
            transactions: {
                matched: 0,
                migrated: 0
            },
            bills: {
                matched: 0,
                migrated: 0,
                skippedConflict: 0
            }
        };

        for (const pair of migrationPairs) {
            if (includeTransactions) {
                // eslint-disable-next-line no-await-in-loop
                const txStats = await migrateTransactions({
                    userId: pair.userId,
                    ownerId: pair.ownerId,
                    apply: shouldApply
                });
                summary.transactions.matched += txStats.matched;
                summary.transactions.migrated += txStats.migrated;
            }
            if (includeBills) {
                // eslint-disable-next-line no-await-in-loop
                const billStats = await migrateBills({
                    userId: pair.userId,
                    ownerId: pair.ownerId,
                    apply: shouldApply
                });
                summary.bills.matched += billStats.matched;
                summary.bills.migrated += billStats.migrated;
                summary.bills.skippedConflict += billStats.skippedConflict;
            }
        }

        console.log('Tenant ownership migration summary');
        console.log(JSON.stringify(summary, null, 2));
        await recordMigrationRun({
            scriptName: 'migrateTenantOwnership',
            mode: summary.mode,
            applied: shouldApply,
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
