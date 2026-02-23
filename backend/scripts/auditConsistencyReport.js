const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const AuditLog = require('../models/AuditLog');
const Bill = require('../models/Bill');
const Purchase = require('../models/Purchase');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const ExpiredOverrideToken = require('../models/ExpiredOverrideToken');

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 2000;
const DESTRUCTIVE_ACTIONS = new Set([
    'CATEGORY_DELETE',
    'BILL_VOID'
]);

const parseArgValue = (flag, fallback) => {
    const index = process.argv.findIndex((arg) => arg === flag);
    if (index < 0) return fallback;
    const value = Number(process.argv[index + 1]);
    if (!Number.isFinite(value)) return fallback;
    return value;
};

const asObjectId = (value) => {
    const raw = String(value || '').trim();
    if (!mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
};

const buildEntityExistsChecker = () => {
    const checkers = {
        bill: async (id) => {
            const objectId = asObjectId(id);
            if (!objectId) return false;
            const row = await Bill.exists({ _id: objectId });
            return Boolean(row);
        },
        purchase: async (id) => {
            const objectId = asObjectId(id);
            if (!objectId) return false;
            const row = await Purchase.exists({ _id: objectId });
            return Boolean(row);
        },
        category: async (id) => {
            const objectId = asObjectId(id);
            if (!objectId) return false;
            const row = await Category.exists({ _id: objectId });
            return Boolean(row);
        },
        transaction: async (id) => {
            const objectId = asObjectId(id);
            if (!objectId) return false;
            const row = await Transaction.exists({ _id: objectId });
            return Boolean(row);
        },
        user: async (id) => {
            const objectId = asObjectId(id);
            if (!objectId) return false;
            const row = await User.exists({ _id: objectId });
            return Boolean(row);
        },
        override_token: async (id) => {
            const objectId = asObjectId(id);
            if (!objectId) return false;
            const row = await ExpiredOverrideToken.exists({ _id: objectId });
            return Boolean(row);
        },
        backup: async () => true
    };

    return async (entityType, entityId) => {
        const key = String(entityType || '').trim().toLowerCase();
        const checker = checkers[key];
        if (!checker) return null;
        return checker(entityId);
    };
};

const run = async () => {
    const days = Math.max(parseArgValue('--days', DEFAULT_DAYS), 1);
    const limit = Math.min(Math.max(parseArgValue('--limit', DEFAULT_LIMIT), 1), 10000);
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    await mongoose.connect(process.env.MONGO_URI);
    const checkEntity = buildEntityExistsChecker();

    const logs = await AuditLog.find({
        status: 'success',
        createdAt: { $gte: since }
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    const checked = [];
    const missing = [];
    const skipped = [];

    for (const log of logs) {
        const entityType = String(log?.entityType || '').trim().toLowerCase();
        const entityId = String(log?.entityId || '').trim();
        if (!entityType) {
            skipped.push({ id: log?._id, reason: 'missing_entity_type' });
            continue;
        }
        if (!entityId) {
            skipped.push({ id: log?._id, reason: 'missing_entity_id', entityType });
            continue;
        }
        // eslint-disable-next-line no-await-in-loop
        const exists = await checkEntity(entityType, entityId);
        if (exists === null) {
            skipped.push({ id: log?._id, reason: 'unsupported_entity_type', entityType, entityId });
            continue;
        }
        const action = String(log?.action || '').trim();
        if (!exists && DESTRUCTIVE_ACTIONS.has(action)) {
            skipped.push({ id: log?._id, reason: 'expected_missing_after_destructive_action', entityType, entityId, action });
            continue;
        }
        checked.push({ id: log?._id, entityType, entityId, action: log?.action });
        if (!exists) {
            missing.push({
                id: log?._id,
                createdAt: log?.createdAt,
                user: log?.user || null,
                action: log?.action || '',
                entityType,
                entityId
            });
        }
    }

    const byType = missing.reduce((acc, row) => {
        const key = row.entityType || 'unknown';
        acc[key] = Number(acc[key] || 0) + 1;
        return acc;
    }, {});

    const summary = {
        windowDays: days,
        scanned: logs.length,
        checked: checked.length,
        missingCount: missing.length,
        skippedCount: skipped.length,
        missingByEntityType: byType
    };

    console.log('Audit consistency summary:', summary);
    if (missing.length) {
        console.log('Missing entity references (top 50):');
        console.log(missing.slice(0, 50));
    }
    if (skipped.length) {
        console.log('Skipped records (top 30):');
        console.log(skipped.slice(0, 30));
    }

    await mongoose.disconnect();
    if (missing.length > 0) {
        process.exitCode = 2;
    }
};

run().catch(async (error) => {
    console.error('auditConsistencyReport failed:', error.message);
    try {
        await mongoose.disconnect();
    } catch (disconnectError) {
        // Ignore disconnect failures on fatal path.
    }
    process.exit(1);
});
