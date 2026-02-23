const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const User = require('../models/User');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const Goal = require('../models/Goal');
const Purchase = require('../models/Purchase');
const AppSetting = require('../models/AppSetting');

const gzip = promisify(zlib.gzip);
const BACKUP_SCHEMA_VERSION = 2;
const DEFAULT_INTERVAL_MINUTES = 360;
const DEFAULT_KEEP_FILES = 30;

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
    const serializablePayload = JSON.parse(JSON.stringify(payload));
    const normalized = normalizeForSignature(serializablePayload);
    const content = JSON.stringify(normalized);
    const key = String(process.env.BACKUP_SIGNING_SECRET || process.env.JWT_SECRET || '').trim();
    if (!key) return '';
    return crypto.createHmac('sha256', key).update(content).digest('hex');
};

const getTenantUserIds = async (adminId) => {
    const users = await User.find({
        $or: [{ _id: adminId }, { ownerAdmin: adminId }]
    }).select('_id').lean();
    return users.map((item) => item?._id).filter(Boolean);
};

const buildAdminBackupPayload = async (adminId) => {
    const tenantUserIds = await getTenantUserIds(adminId);
    const [settings, categories, purchases, transactions, bills, goals, users] = await Promise.all([
        AppSetting.findOne({ user: adminId }).lean(),
        Category.find({ user: adminId }).lean(),
        Purchase.find({ user: adminId }).lean(),
        Transaction.find({ user: adminId }).lean(),
        Bill.find({ user: adminId }).lean(),
        Goal.find({ user: adminId }).lean(),
        User.find({ _id: { $in: tenantUserIds } }).select('_id name email role ownerAdmin createdAt updatedAt').lean()
    ]);
    return {
        settings: settings || null,
        categories: categories || [],
        purchases: purchases || [],
        transactions: transactions || [],
        bills: bills || [],
        goals: goals || [],
        users: users || []
    };
};

const ensureDir = async (dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
};

const cleanupOldSnapshots = async (snapshotDir, keepFiles) => {
    const files = await fs.readdir(snapshotDir);
    const sorted = files
        .filter((name) => name.endsWith('.json.gz'))
        .sort((a, b) => b.localeCompare(a));
    const toDelete = sorted.slice(Math.max(keepFiles, 0));
    await Promise.all(toDelete.map((name) => fs.unlink(path.join(snapshotDir, name)).catch(() => {})));
};

const writeSnapshotForAdmin = async (admin) => {
    const baseDir = String(process.env.BACKUP_SNAPSHOT_DIR || '').trim() || path.join(process.cwd(), 'backups', 'snapshots');
    const keepFiles = Math.max(Number(process.env.BACKUP_SNAPSHOT_KEEP_FILES || DEFAULT_KEEP_FILES), 1);
    const snapshotDir = path.join(baseDir, String(admin._id));
    await ensureDir(snapshotDir);

    const data = await buildAdminBackupPayload(admin._id);
    const checksum = computeChecksum(data);
    const envelope = {
        version: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        tenantAdminId: String(admin._id),
        tenantAdminEmail: String(admin.email || ''),
        checksum,
        data
    };

    const raw = Buffer.from(JSON.stringify(envelope), 'utf8');
    const compressed = await gzip(raw, { level: 9 });
    const fileName = `${new Date().toISOString().replace(/[:.]/g, '-')}.json.gz`;
    await fs.writeFile(path.join(snapshotDir, fileName), compressed);
    await cleanupOldSnapshots(snapshotDir, keepFiles);
};

const runSnapshotCycle = async () => {
    const admins = await User.find({ role: 'admin' }).select('_id email').lean();
    for (const admin of admins) {
        // Run sequentially to keep resource usage predictable.
        // eslint-disable-next-line no-await-in-loop
        await writeSnapshotForAdmin(admin);
    }
    return admins.length;
};

const startBackupScheduler = () => {
    const enabled = String(process.env.BACKUP_SNAPSHOT_ENABLED || '').trim().toLowerCase() === 'true';
    if (!enabled) {
        return () => {};
    }
    const intervalMinutes = Math.max(Number(process.env.BACKUP_SNAPSHOT_INTERVAL_MINUTES || DEFAULT_INTERVAL_MINUTES), 10);
    const intervalMs = intervalMinutes * 60 * 1000;
    let inFlight = false;

    const runSafely = async () => {
        if (inFlight) return;
        inFlight = true;
        try {
            const count = await runSnapshotCycle();
            console.log(`Backup snapshot cycle completed for ${count} admin tenant(s).`);
        } catch (error) {
            console.log('Backup snapshot cycle failed:', error.message);
        } finally {
            inFlight = false;
        }
    };

    const runOnStart = String(process.env.BACKUP_SNAPSHOT_RUN_ON_START || '').trim().toLowerCase() === 'true';
    if (runOnStart) {
        runSafely();
    }
    const timer = setInterval(runSafely, intervalMs);
    if (typeof timer.unref === 'function') {
        timer.unref();
    }
    return () => clearInterval(timer);
};

module.exports = {
    startBackupScheduler,
    runSnapshotCycle
};
