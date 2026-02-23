const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const User = require('../models/User');

const gunzip = promisify(zlib.gunzip);

const normalizeForSignature = (value) => {
    if (Array.isArray(value)) return value.map(normalizeForSignature);
    if (value && typeof value === 'object') {
        return Object.keys(value).sort().reduce((acc, key) => {
            acc[key] = normalizeForSignature(value[key]);
            return acc;
        }, {});
    }
    return value;
};

const computeChecksum = (payload) => {
    const key = String(process.env.BACKUP_SIGNING_SECRET || process.env.JWT_SECRET || '').trim();
    if (!key) return '';
    const serializablePayload = JSON.parse(JSON.stringify(payload));
    return crypto
        .createHmac('sha256', key)
        .update(JSON.stringify(normalizeForSignature(serializablePayload)))
        .digest('hex');
};

const getSnapshotBaseDir = () => {
    const configured = String(process.env.BACKUP_SNAPSHOT_DIR || '').trim();
    return configured ? path.resolve(configured) : path.join(process.cwd(), 'backups', 'snapshots');
};

const getLatestSnapshotPath = async (adminId) => {
    const tenantDir = path.join(getSnapshotBaseDir(), String(adminId || ''));
    try {
        const files = await fs.readdir(tenantDir);
        const latest = files
            .filter((name) => name.endsWith('.json.gz'))
            .sort((a, b) => b.localeCompare(a))[0];
        if (!latest) return null;
        return path.join(tenantDir, latest);
    } catch (error) {
        return null;
    }
};

const parseSnapshotEnvelope = async (filePath) => {
    const compressed = await fs.readFile(filePath);
    const raw = await gunzip(compressed);
    return JSON.parse(raw.toString('utf8'));
};

const drillTenant = async (admin) => {
    const latestPath = await getLatestSnapshotPath(admin._id);
    if (!latestPath) {
        return {
            adminId: String(admin._id),
            email: admin.email,
            ok: false,
            error: 'NO_SNAPSHOT_FILE'
        };
    }
    const envelope = await parseSnapshotEnvelope(latestPath);
    const checksum = String(envelope?.checksum || '').trim();
    const data = envelope?.data || {};
    const recomputed = computeChecksum(data);
    const checksumOk = checksum && recomputed && checksum === recomputed;
    const exportedAt = envelope?.exportedAt ? new Date(envelope.exportedAt).getTime() : 0;
    const ageMinutes = exportedAt > 0 ? Math.floor((Date.now() - exportedAt) / (60 * 1000)) : null;
    return {
        adminId: String(admin._id),
        email: admin.email,
        ok: Boolean(checksumOk),
        checksumOk: Boolean(checksumOk),
        file: path.basename(latestPath),
        exportedAt: envelope?.exportedAt || null,
        ageMinutes,
        counts: {
            categories: Array.isArray(data?.categories) ? data.categories.length : 0,
            purchases: Array.isArray(data?.purchases) ? data.purchases.length : 0,
            transactions: Array.isArray(data?.transactions) ? data.transactions.length : 0,
            bills: Array.isArray(data?.bills) ? data.bills.length : 0,
            goals: Array.isArray(data?.goals) ? data.goals.length : 0,
            users: Array.isArray(data?.users) ? data.users.length : 0
        }
    };
};

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const admins = await User.find({ role: 'admin' }).select('_id email').lean();
    const results = [];
    for (const admin of admins) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const summary = await drillTenant(admin);
            results.push(summary);
        } catch (error) {
            results.push({
                adminId: String(admin._id),
                email: admin.email,
                ok: false,
                error: String(error?.message || 'UNKNOWN_ERROR')
            });
        }
    }
    const failed = results.filter((item) => !item.ok);
    console.log('Backup drill results:', {
        tenants: results.length,
        passed: results.length - failed.length,
        failed: failed.length
    });
    console.log(results);
    await mongoose.disconnect();
    if (failed.length > 0) {
        process.exitCode = 2;
    }
};

run().catch(async (error) => {
    console.error('backupDrillSnapshots failed:', error.message);
    try {
        await mongoose.disconnect();
    } catch (_disconnectError) {}
    process.exit(1);
});
