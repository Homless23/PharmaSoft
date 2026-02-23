const User = require('../models/User');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const LoginEvent = require('../models/LoginEvent');
const AuditLog = require('../models/AuditLog');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const ExpiredOverrideToken = require('../models/ExpiredOverrideToken');
const Goal = require('../models/Goal');
const Purchase = require('../models/Purchase');
const AppSetting = require('../models/AppSetting');
const { getDbHealth } = require('../config/db');
const { cleanupCategoryDuplicatesForUser } = require('../utils/categoryCleanup');
const { sendError } = require('../utils/apiResponse');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const parseBooleanFlag = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
};
const INCOME_CATEGORY_NAMES = ['Retail Sales', 'Online Orders', 'Insurance Claims', 'Clinic Supplies', 'Wholesale'];
const OUTFLOW_FALLBACK_CATEGORIES = ['Medicine Procurement', 'Supplier Payments', 'Utilities', 'Staff Salaries', 'Rent', 'Equipment', 'Other'];
const OUTFLOW_TITLES = [
    'Bulk Antibiotic Purchase', 'Analgesic Refill', 'Cold Storage Service',
    'Supplier Settlement', 'Pharmacy Shelf Restock', 'OTC Restock',
    'Prescription Inventory Refill', 'Utility Bill', 'Packaging Material Purchase',
    'Dispensing Equipment Maintenance', 'POS Subscription', 'Warehouse Handling Fee'
];
const INCOME_TITLES = ['Counter Sales', 'Insurance Reimbursement', 'Online Pharmacy Sales', 'Clinic Supply Invoice', 'Wholesale Dispatch'];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const ALLOWED_USER_ROLES = new Set(['admin', 'pharmacist', 'cashier', 'user']);
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const tenantUserQuery = (adminId) => ({
    $or: [
        { _id: adminId },
        { ownerAdmin: adminId }
    ]
});
const getTenantUsers = async (adminId) => {
    return User.find(tenantUserQuery(adminId))
        .select('_id email role ownerAdmin')
        .lean();
};
const getTenantUserIds = (users) => users.map((item) => item?._id).filter(Boolean);
const getTenantEmails = (users) => users.map((item) => String(item?.email || '').trim().toLowerCase()).filter(Boolean);
const canManageAdminRole = (req) => {
    const configuredSuperAdminEmail = normalizeEmail(process.env.SUPER_ADMIN_EMAIL || '');
    if (!configuredSuperAdminEmail) return false;
    return normalizeEmail(req.user?.email || '') === configuredSuperAdminEmail;
};
const randomPastDate = (daysBack = 90) => {
    const now = Date.now();
    const backMs = rand(0, daysBack) * 24 * 60 * 60 * 1000;
    const d = new Date(now - backMs);
    d.setHours(rand(7, 21), rand(0, 59), rand(0, 59), 0);
    return d;
};

const BACKUP_SCHEMA_VERSION = 2;
const normalizeForSignature = (value) => {
    if (Array.isArray(value)) {
        return value.map(normalizeForSignature);
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
                acc[key] = normalizeForSignature(value[key]);
                return acc;
            }, {});
    }
    return value;
};
const computeBackupChecksum = (backupPayload, secret) => {
    const normalized = normalizeForSignature(backupPayload);
    const content = JSON.stringify(normalized);
    const key = String(secret || process.env.BACKUP_SIGNING_SECRET || process.env.JWT_SECRET || '').trim();
    if (!key) return '';
    return crypto.createHmac('sha256', key).update(content).digest('hex');
};
const getBackupEncryptionKey = () => {
    const secret = String(process.env.BACKUP_EXPORT_ENCRYPTION_KEY || '').trim();
    if (!secret) return null;
    return crypto.createHash('sha256').update(secret).digest();
};
const encryptBackupPayload = (payload) => {
    const key = getBackupEncryptionKey();
    if (!key) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        algorithm: 'aes-256-gcm',
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        ciphertext: encrypted.toString('base64')
    };
};
const decryptBackupPayload = (envelope = {}) => {
    const key = getBackupEncryptionKey();
    if (!key) return null;
    const iv = Buffer.from(String(envelope.iv || ''), 'base64');
    const tag = Buffer.from(String(envelope.tag || ''), 'base64');
    const ciphertext = Buffer.from(String(envelope.ciphertext || ''), 'base64');
    if (!iv.length || !tag.length || !ciphertext.length) {
        throw new Error('Invalid encrypted backup envelope');
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
};
const isEncryptedBackupEnvelope = (value) => {
    return Boolean(
        value
        && typeof value === 'object'
        && String(value.algorithm || '').trim().toLowerCase() === 'aes-256-gcm'
        && String(value.iv || '').trim()
        && String(value.tag || '').trim()
        && String(value.ciphertext || '').trim()
    );
};
const resolveBackupDataPayload = (req) => {
    const body = req.body || {};
    const encryptedEnvelope = body?.encryptedBackup;
    if (isEncryptedBackupEnvelope(encryptedEnvelope)) {
        const decrypted = decryptBackupPayload(encryptedEnvelope);
        return { payload: decrypted, encrypted: true };
    }
    const allowPlainLegacy = parseBooleanFlag(process.env.BACKUP_ALLOW_PLAINTEXT_LEGACY);
    if (!allowPlainLegacy) {
        throw new Error('Plaintext backup payload is disabled');
    }
    return { payload: body?.data || body, encrypted: false };
};

const buildBackupDataPayload = ({
    settings = null,
    categories = [],
    purchases = [],
    transactions = [],
    bills = [],
    goals = [],
    users = []
} = {}) => ({
    settings: settings || null,
    categories: Array.isArray(categories) ? categories : [],
    purchases: Array.isArray(purchases) ? purchases : [],
    transactions: Array.isArray(transactions) ? transactions : [],
    bills: Array.isArray(bills) ? bills : [],
    goals: Array.isArray(goals) ? goals : [],
    users: Array.isArray(users) ? users : []
});
const getSnapshotBaseDir = () => {
    const configured = String(process.env.BACKUP_SNAPSHOT_DIR || '').trim();
    if (configured) return path.resolve(configured);
    return path.join(process.cwd(), 'backups', 'snapshots');
};
const getLatestSnapshotInfo = async (adminId) => {
    const tenantDir = path.join(getSnapshotBaseDir(), String(adminId || '').trim());
    try {
        const files = await fs.readdir(tenantDir);
        const latest = files
            .filter((name) => name.endsWith('.json.gz'))
            .sort((a, b) => b.localeCompare(a))[0];
        if (!latest) return null;
        const absolutePath = path.join(tenantDir, latest);
        const stat = await fs.stat(absolutePath);
        const snapshotAt = stat?.mtime instanceof Date ? stat.mtime.toISOString() : null;
        return {
            exists: true,
            fileName: latest,
            snapshotAt,
            sizeBytes: Number(stat?.size || 0)
        };
    } catch (error) {
        return null;
    }
};
const RELEASE_GATE_STATUS_FILE = path.join(process.cwd(), 'runtime', 'release-gate-status.json');
const COMPLIANCE_STATUS_FILE = path.join(process.cwd(), 'runtime', 'compliance-readiness-status.json');
const PROJECT_ROOT_DIR = path.resolve(process.cwd(), '..');
let releaseGateRunInProgress = false;
let complianceRunInProgress = false;
const parseIrdBillNumber = (value) => {
    const raw = String(value || '').trim();
    const match = /^IRD-(\d{4}-\d{2})-(\d{6})$/i.exec(raw);
    if (!match) return null;
    return { fiscalYear: match[1], sequence: Number(match[2]) };
};
const getNepalFiscalYear = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const startsNewFiscalYear = month > 7 || (month === 7 && day >= 16);
    const fyStart = startsNewFiscalYear ? year : year - 1;
    const fyEndShort = String((fyStart + 1) % 100).padStart(2, '0');
    return `${fyStart}-${fyEndShort}`;
};
const getLastReleaseGateStatus = async () => {
    try {
        const raw = await fs.readFile(RELEASE_GATE_STATUS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return {
            status: String(parsed?.status || 'unknown'),
            generatedAt: parsed?.generatedAt || null,
            summary: parsed?.summary || null
        };
    } catch (_error) {
        return {
            status: 'not_run',
            generatedAt: null,
            summary: null
        };
    }
};
const getLastComplianceStatus = async () => {
    try {
        const raw = await fs.readFile(COMPLIANCE_STATUS_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (_error) {
        return null;
    }
};
const runNodeScript = ({ scriptPath, args = [], cwd, timeoutMs = 5 * 60 * 1000 }) => {
    return new Promise((resolve) => {
        const startedAtMs = Date.now();
        const child = spawn(process.execPath, [scriptPath, ...args], {
            cwd,
            env: process.env
        });
        let timedOut = false;
        let stdout = '';
        let stderr = '';
        const MAX_CAPTURE = 20000;

        const appendChunk = (source, chunk) => {
            const next = `${source}${String(chunk || '')}`;
            if (next.length <= MAX_CAPTURE) return next;
            return next.slice(next.length - MAX_CAPTURE);
        };

        const timeout = setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
        }, timeoutMs);

        child.stdout.on('data', (chunk) => {
            stdout = appendChunk(stdout, chunk);
        });
        child.stderr.on('data', (chunk) => {
            stderr = appendChunk(stderr, chunk);
        });
        child.on('close', (code) => {
            clearTimeout(timeout);
            resolve({
                code: Number(code ?? 1),
                ok: Number(code ?? 1) === 0,
                timedOut,
                durationMs: Date.now() - startedAtMs,
                stdout,
                stderr
            });
        });
        child.on('error', (error) => {
            clearTimeout(timeout);
            resolve({
                code: 1,
                ok: false,
                timedOut,
                durationMs: Date.now() - startedAtMs,
                stdout,
                stderr: appendChunk(stderr, error?.message || 'Failed to spawn script process')
            });
        });
    });
};

// GET /api/admin/users
const getUsers = async (req, res) => {
    try {
        const users = await User.find(tenantUserQuery(req.user.id))
            .select('_id name email role createdAt lastLoginAt')
            .sort({ createdAt: -1 });
        return res.json(users);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_USERS_FETCH_ERROR');
    }
};

// GET /api/admin/logins
const getLoginEvents = async (req, res) => {
    try {
        const tenantUsers = await getTenantUsers(req.user.id);
        const tenantUserIds = getTenantUserIds(tenantUsers);
        const tenantEmails = getTenantEmails(tenantUsers);
        const events = await LoginEvent.find({
            $or: [
                { user: { $in: tenantUserIds } },
                { email: { $in: tenantEmails } }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(300);
        return res.json(events);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_LOGINS_FETCH_ERROR');
    }
};

// GET /api/admin/audit-logs
const getAuditLogs = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query?.limit) || 200, 1), 500);
        const action = String(req.query?.action || '').trim();
        const status = String(req.query?.status || '').trim().toLowerCase();
        const tenantUsers = await getTenantUsers(req.user.id);
        const tenantUserIds = getTenantUserIds(tenantUsers);
        const query = { user: { $in: tenantUserIds } };
        if (action) query.action = action;
        if (status === 'success' || status === 'failure') {
            query.status = status;
        }

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('user', '_id name email role');
        return res.json(logs);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_AUDIT_LOGS_FETCH_ERROR');
    }
};

// POST /api/admin/users
const createUserByAdmin = async (req, res) => {
    const { name, email, password, role } = req.body;
    const cleanedName = String(name || '').trim();
    const normalizedEmail = normalizeEmail(email);
    const cleanedPassword = String(password || '');
    const normalizedRole = String(role || '').trim().toLowerCase();
    const nextRole = ALLOWED_USER_ROLES.has(normalizedRole) ? normalizedRole : 'user';

    try {
        if (!cleanedName || !normalizedEmail || !cleanedPassword) {
            return sendError(res, 400, 'Name, email, and password are required', 'ADMIN_USER_FIELDS_REQUIRED');
        }
        if (!STRONG_PASSWORD_PATTERN.test(cleanedPassword)) {
            return sendError(
                res,
                400,
                'Password must be at least 8 chars and include uppercase, lowercase, number, and symbol',
                'ADMIN_USER_PASSWORD_WEAK'
            );
        }
        if (nextRole === 'admin' && !canManageAdminRole(req)) {
            return sendError(res, 403, 'Only super admin can create admin accounts', 'ADMIN_ROLE_ASSIGN_FORBIDDEN');
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return sendError(res, 400, 'User already exists', 'ADMIN_USER_EXISTS');
        }

        const user = await User.create({
            name: cleanedName,
            email: normalizedEmail,
            password: cleanedPassword,
            role: nextRole,
            ownerAdmin: req.user.id
        });

        return res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        });
    } catch (error) {
        if (error?.code === 11000) {
            return sendError(res, 400, 'User already exists', 'ADMIN_USER_EXISTS');
        }
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_USER_CREATE_ERROR');
    }
};

// PUT /api/admin/users/:id/role
const updateUserRoleByAdmin = async (req, res) => {
    const { id } = req.params;
    const requestedRole = String(req.body?.role || '').trim().toLowerCase();
    try {
        if (!ALLOWED_USER_ROLES.has(requestedRole)) {
            return sendError(
                res,
                400,
                'Invalid role. Allowed roles: admin, pharmacist, cashier, user',
                'ADMIN_ROLE_INVALID'
            );
        }
        if (requestedRole === 'admin' && !canManageAdminRole(req)) {
            return sendError(res, 403, 'Only super admin can assign admin role', 'ADMIN_ROLE_ASSIGN_FORBIDDEN');
        }

        const user = await User.findOne({
            _id: id,
            $or: [
                { ownerAdmin: req.user.id },
                { _id: req.user.id }
            ]
        });
        if (!user) {
            return sendError(res, 404, 'User not found', 'ADMIN_USER_NOT_FOUND');
        }
        if (String(req.user.id) === String(user._id) && requestedRole !== 'admin') {
            return sendError(res, 400, 'Admin cannot demote own account', 'ADMIN_SELF_DEMOTION_BLOCKED');
        }

        user.role = requestedRole;
        await user.save();
        return res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_ROLE_UPDATE_ERROR');
    }
};

// DELETE /api/admin/users/:id
const deleteUserByAdmin = async (req, res) => {
    const { id } = req.params;

    try {
        if (String(req.user.id) === String(id)) {
            return sendError(res, 400, 'Admin cannot delete own account', 'ADMIN_SELF_DELETE_BLOCKED');
        }

        const user = await User.findOne({
            _id: id,
            $or: [
                { ownerAdmin: req.user.id },
                { _id: req.user.id }
            ]
        });
        if (!user) {
            return sendError(res, 404, 'User not found', 'ADMIN_USER_NOT_FOUND');
        }

        await User.findByIdAndDelete(id);
        return res.json({ message: 'User deleted' });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_USER_DELETE_ERROR');
    }
};

// POST /api/admin/categories/cleanup-duplicates
const cleanupCategoryDuplicatesForAllUsers = async (req, res) => {
    try {
        const tenantUsers = await getTenantUsers(req.user.id);
        const tenantUserIds = getTenantUserIds(tenantUsers);
        const userIds = await Category.distinct('user', {
            user: { $in: tenantUserIds, $ne: null }
        });
        if (!userIds.length) {
            return res.json({
                message: 'No category data found',
                usersProcessed: 0,
                removed: 0,
                updated: 0,
                groupsWithDuplicates: 0,
                results: []
            });
        }

        const results = [];
        for (const userId of userIds) {
            // Sequential processing keeps DB pressure low for shared hosting.
            // eslint-disable-next-line no-await-in-loop
            const summary = await cleanupCategoryDuplicatesForUser(userId);
            results.push(summary);
        }

        const totals = results.reduce((acc, item) => {
            acc.removed += Number(item.removed || 0);
            acc.updated += Number(item.updated || 0);
            acc.groupsWithDuplicates += Number(item.groupsWithDuplicates || 0);
            return acc;
        }, { removed: 0, updated: 0, groupsWithDuplicates: 0 });

        return res.json({
            message: 'Category duplicate cleanup completed for all users',
            usersProcessed: results.length,
            ...totals,
            results
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_CATEGORY_CLEANUP_ERROR');
    }
};

// POST /api/admin/seed-random-entries
const seedRandomEntriesForAdmin = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestedOutflowCount = Number(req.body?.outflowCount);
        const requestedIncomeCount = Number(req.body?.incomeCount);
        const outflowCount = Number.isFinite(requestedOutflowCount)
            ? Math.min(Math.max(Math.floor(requestedOutflowCount), 1), 200)
            : 30;
        const incomeCount = Number.isFinite(requestedIncomeCount)
            ? Math.min(Math.max(Math.floor(requestedIncomeCount), 1), 120)
            : 12;

        const categories = await Category.find({ user: userId, active: { $ne: false } }).select('name');
        const userCategoryNames = categories.map((c) => String(c.name || '').trim()).filter(Boolean);
        const incomeLookup = new Set(INCOME_CATEGORY_NAMES.map((item) => item.toLowerCase()));
        const incomeCategories = Array.from(new Set([
            ...userCategoryNames.filter((name) => incomeLookup.has(name.toLowerCase())),
            ...INCOME_CATEGORY_NAMES
        ]));
        const outflowCategories = Array.from(new Set([
            ...userCategoryNames.filter((name) => !incomeLookup.has(name.toLowerCase())),
            ...OUTFLOW_FALLBACK_CATEGORIES
        ]));

        const docs = [];
        for (let i = 0; i < outflowCount; i += 1) {
            docs.push({
                user: userId,
                type: 'outflow',
                title: pick(OUTFLOW_TITLES),
                amount: rand(80, 2500),
                category: pick(outflowCategories),
                description: '',
                date: randomPastDate(120),
                recurring: { enabled: false, frequency: 'monthly', autoCreate: false }
            });
        }
        for (let i = 0; i < incomeCount; i += 1) {
            docs.push({
                user: userId,
                type: 'income',
                title: pick(INCOME_TITLES),
                amount: rand(1200, 18000),
                category: pick(incomeCategories),
                description: '',
                date: randomPastDate(120),
                recurring: { enabled: false, frequency: 'monthly', autoCreate: false }
            });
        }

        await Transaction.insertMany(docs, { ordered: false });

        return res.json({
            message: 'Random test entries added',
            outflowCount,
            incomeCount,
            totalAdded: docs.length
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_SEED_ENTRIES_ERROR');
    }
};

// GET /api/admin/expired-overrides
const getExpiredOverrideAudit = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query?.limit) || 120, 1), 500);
        const tenantUsers = await getTenantUsers(req.user.id);
        const tenantUserIds = getTenantUserIds(tenantUsers);

        const [tokens, bills] = await Promise.all([
            ExpiredOverrideToken.find({
                $or: [
                    { issuedBy: { $in: tenantUserIds } },
                    { usedBy: { $in: tenantUserIds } }
                ]
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('issuedBy', '_id name email role')
                .populate('usedBy', '_id name email role')
                .lean(),
            Bill.find({
                user: { $in: tenantUserIds },
                'expiredOverride.approved': true
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .select('billNumber billDate customerName paymentMethod grandTotal expiredOverride createdAt')
                .populate('expiredOverride.approvedBy', '_id name email role')
                .lean()
        ]);

        return res.json({ tokens, bills });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_EXPIRED_OVERRIDES_FETCH_ERROR');
    }
};

// GET /api/admin/ops/metrics
const getOpsMetrics = async (req, res) => {
    try {
        const tenantUsers = await getTenantUsers(req.user.id);
        const tenantUserIds = getTenantUserIds(tenantUsers);
        const inventoryOwnerId = req.user.id;
        const since24h = new Date(Date.now() - (24 * 60 * 60 * 1000));

        const [
            categoriesCount,
            transactionsCount,
            purchasesCount,
            billsCount,
            goalsCount,
            audit24hCount,
            audit24hFailureCount,
            latestSnapshot
        ] = await Promise.all([
            Category.countDocuments({ user: inventoryOwnerId }),
            Transaction.countDocuments({ user: inventoryOwnerId }),
            Purchase.countDocuments({ user: inventoryOwnerId }),
            Bill.countDocuments({ user: inventoryOwnerId }),
            Goal.countDocuments({ user: inventoryOwnerId }),
            AuditLog.countDocuments({ user: { $in: tenantUserIds }, createdAt: { $gte: since24h } }),
            AuditLog.countDocuments({ user: { $in: tenantUserIds }, createdAt: { $gte: since24h }, status: 'failure' }),
            getLatestSnapshotInfo(inventoryOwnerId)
        ]);

        const mem = process.memoryUsage();
        const nowMs = Date.now();
        const latestSnapshotAtMs = latestSnapshot?.snapshotAt ? new Date(latestSnapshot.snapshotAt).getTime() : 0;
        const backupAgeMinutes = latestSnapshotAtMs > 0
            ? Math.floor((nowMs - latestSnapshotAtMs) / (60 * 1000))
            : null;
        const backupEnabled = String(process.env.BACKUP_SNAPSHOT_ENABLED || '').trim().toLowerCase() === 'true';
        const maxAuditFailures24h = Math.max(Number(process.env.OPS_MAX_AUDIT_FAILURES_24H || 25), 0);
        const maxRssMb = Math.max(Number(process.env.OPS_MAX_MEMORY_RSS_MB || 768), 128);
        const maxBackupAgeMinutes = Math.max(
            Number(process.env.OPS_MAX_BACKUP_AGE_MINUTES || (Number(process.env.BACKUP_SNAPSHOT_INTERVAL_MINUTES || 360) * 2)),
            10
        );
        const rssMb = Number((mem.rss / (1024 * 1024)).toFixed(2));
        const warnings = [];
        if (!getDbHealth()?.isConnected) {
            warnings.push({ code: 'OPS_DB_DISCONNECTED', severity: 'critical', message: 'Database is not connected' });
        }
        if (audit24hFailureCount > maxAuditFailures24h) {
            warnings.push({
                code: 'OPS_AUDIT_FAILURE_SPIKE',
                severity: 'warning',
                message: `Audit failures in last 24h (${audit24hFailureCount}) exceed threshold (${maxAuditFailures24h})`
            });
        }
        if (rssMb > maxRssMb) {
            warnings.push({
                code: 'OPS_MEMORY_HIGH',
                severity: 'warning',
                message: `Process RSS ${rssMb}MB exceeds threshold ${maxRssMb}MB`
            });
        }
        if (backupEnabled) {
            if (!latestSnapshot) {
                warnings.push({
                    code: 'OPS_BACKUP_MISSING',
                    severity: 'critical',
                    message: 'Backups are enabled but no snapshot file was found for this tenant'
                });
            } else if (Number.isFinite(backupAgeMinutes) && backupAgeMinutes > maxBackupAgeMinutes) {
                warnings.push({
                    code: 'OPS_BACKUP_STALE',
                    severity: 'warning',
                    message: `Latest snapshot is ${backupAgeMinutes} minutes old (threshold ${maxBackupAgeMinutes})`
                });
            }
        }
        return res.json({
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            db: getDbHealth(),
            memory: {
                rssMb,
                heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(2)),
                heapTotalMb: Number((mem.heapTotal / (1024 * 1024)).toFixed(2))
            },
            tenant: {
                users: tenantUsers.length,
                categories: categoriesCount,
                transactions: transactionsCount,
                purchases: purchasesCount,
                bills: billsCount,
                goals: goalsCount
            },
            auditLast24h: {
                total: audit24hCount,
                failures: audit24hFailureCount
            },
            backup: {
                enabled: backupEnabled,
                latestSnapshot: latestSnapshot || null,
                ageMinutes: Number.isFinite(backupAgeMinutes) ? backupAgeMinutes : null
            },
            warnings
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_OPS_METRICS_FETCH_ERROR');
    }
};

// GET /api/admin/ops/release-readiness
const getReleaseReadiness = async (req, res) => {
    try {
        const inventoryOwnerId = req.user.id;
        const windowDays = Math.max(Math.min(Number(req.query?.days) || 365, 730), 1);
        const since = new Date(Date.now() - (windowDays * 24 * 60 * 60 * 1000));
        const ownerObjectId = mongoose.Types.ObjectId.isValid(inventoryOwnerId)
            ? new mongoose.Types.ObjectId(inventoryOwnerId)
            : null;
        const bills = await Bill.find({
            user: inventoryOwnerId,
            createdAt: { $gte: since }
        })
            .sort({ createdAt: -1 })
            .select('_id billNumber billDate fiscalYear invoiceSequence status')
            .lean();

        const billIds = bills.map((bill) => String(bill?._id || '').trim()).filter(Boolean);
        const billNumbers = bills.map((bill) => String(bill?.billNumber || '').trim()).filter(Boolean);
        const auditLogs = billIds.length || billNumbers.length
            ? await AuditLog.find({
                createdAt: { $gte: since },
                action: { $in: ['BILL_FINALIZE', 'BILL_VOID'] },
                status: 'success',
                $or: [
                    billIds.length ? { entityId: { $in: billIds } } : null,
                    billNumbers.length ? { 'details.billNumber': { $in: billNumbers } } : null
                ].filter(Boolean)
            })
                .select('action entityId details.billNumber')
                .lean()
            : [];

        const duplicateInvoiceStats = ownerObjectId ? await Bill.aggregate([
            { $match: { user: ownerObjectId, createdAt: { $gte: since } } },
            { $group: { _id: '$billNumber', count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            {
                $facet: {
                    count: [{ $count: 'total' }],
                    sample: [{ $sort: { count: -1 } }, { $limit: 20 }]
                }
            }
        ]) : [];
        const duplicateInvoiceGroupsCount = Number(duplicateInvoiceStats?.[0]?.count?.[0]?.total || 0);

        const finalizeEntityIds = new Set();
        const finalizeBillNumbers = new Set();
        const voidEntityIds = new Set();
        const voidBillNumbers = new Set();
        auditLogs.forEach((log) => {
            const entityId = String(log?.entityId || '').trim();
            const billNumber = String(log?.details?.billNumber || '').trim();
            if (String(log?.action) === 'BILL_FINALIZE') {
                if (entityId) finalizeEntityIds.add(entityId);
                if (billNumber) finalizeBillNumbers.add(billNumber);
            }
            if (String(log?.action) === 'BILL_VOID') {
                if (entityId) voidEntityIds.add(entityId);
                if (billNumber) voidBillNumbers.add(billNumber);
            }
        });

        let invoiceFormatWarnings = 0;
        let fiscalYearMismatches = 0;
        let sequenceIssues = 0;
        let missingFinalizeAudit = 0;
        let missingVoidAudit = 0;
        const seenSeqByFy = new Set();

        bills.forEach((bill) => {
            const billId = String(bill?._id || '').trim();
            const billNumber = String(bill?.billNumber || '').trim();
            const parsed = parseIrdBillNumber(billNumber);
            if (!parsed) {
                invoiceFormatWarnings += 1;
            } else {
                const derivedFy = getNepalFiscalYear(bill.billDate);
                if (!derivedFy || parsed.fiscalYear !== derivedFy || String(bill?.fiscalYear || '') !== derivedFy) {
                    fiscalYearMismatches += 1;
                }
                const seqField = Number(bill?.invoiceSequence || 0);
                if (seqField > 0 && seqField !== parsed.sequence) {
                    sequenceIssues += 1;
                }
                const seqKey = `${parsed.fiscalYear}::${parsed.sequence}`;
                if (seenSeqByFy.has(seqKey)) {
                    sequenceIssues += 1;
                } else {
                    seenSeqByFy.add(seqKey);
                }
            }

            if (!finalizeEntityIds.has(billId) && !finalizeBillNumbers.has(billNumber)) {
                missingFinalizeAudit += 1;
            }
            if (String(bill?.status || 'finalized') === 'voided') {
                if (!voidEntityIds.has(billId) && !voidBillNumbers.has(billNumber)) {
                    missingVoidAudit += 1;
                }
            }
        });

        const criticalCount = duplicateInvoiceGroupsCount + fiscalYearMismatches + sequenceIssues + missingFinalizeAudit + missingVoidAudit;
        const warningCount = invoiceFormatWarnings;
        const releaseGate = await getLastReleaseGateStatus();

        return res.json({
            generatedAt: new Date().toISOString(),
            windowDays,
            scannedBills: bills.length,
            scannedAuditLogs: auditLogs.length,
            criticalCount,
            warningCount,
            checks: {
                duplicateInvoiceGroups: duplicateInvoiceGroupsCount,
                fiscalYearMismatches,
                sequenceIssues,
                missingFinalizeAudit,
                missingVoidAudit,
                nonIrdInvoiceWarnings: invoiceFormatWarnings
            },
            duplicateInvoiceSamples: Array.isArray(duplicateInvoiceStats?.[0]?.sample)
                ? duplicateInvoiceStats[0].sample
                : [],
            status: criticalCount > 0 ? 'blocked' : (warningCount > 0 ? 'warning' : 'ready'),
            releaseGate
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_RELEASE_READINESS_FETCH_ERROR');
    }
};

// POST /api/admin/ops/release-gate/run
const runReleaseGateNow = async (req, res) => {
    try {
        if (releaseGateRunInProgress) {
            return sendError(res, 409, 'Release gate run already in progress', 'RELEASE_GATE_ALREADY_RUNNING');
        }
        releaseGateRunInProgress = true;
        const result = await runNodeScript({
            scriptPath: path.join('scripts', 'releaseGate.js'),
            cwd: PROJECT_ROOT_DIR,
            timeoutMs: 20 * 60 * 1000
        });
        const releaseGate = await getLastReleaseGateStatus();
        return res.json({
            message: result.ok ? 'Release gate completed' : 'Release gate finished with failures',
            process: {
                exitCode: result.code,
                timedOut: result.timedOut,
                durationMs: result.durationMs
            },
            releaseGate,
            logs: {
                stdoutTail: result.stdout,
                stderrTail: result.stderr
            }
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_RELEASE_GATE_RUN_ERROR');
    } finally {
        releaseGateRunInProgress = false;
    }
};

// POST /api/admin/ops/compliance/run
const runComplianceReadinessNow = async (req, res) => {
    try {
        if (complianceRunInProgress) {
            return sendError(res, 409, 'Compliance report run already in progress', 'COMPLIANCE_RUN_ALREADY_RUNNING');
        }
        complianceRunInProgress = true;
        const days = Math.max(Math.min(Number(req.body?.days) || 365, 730), 1);
        const result = await runNodeScript({
            scriptPath: path.join('scripts', 'complianceReadinessReport.js'),
            args: ['--days', String(days)],
            cwd: process.cwd(),
            timeoutMs: 10 * 60 * 1000
        });
        const compliance = await getLastComplianceStatus();
        return res.json({
            message: result.ok ? 'Compliance report completed' : 'Compliance report finished with findings/errors',
            process: {
                exitCode: result.code,
                timedOut: result.timedOut,
                durationMs: result.durationMs
            },
            compliance: compliance || null,
            logs: {
                stdoutTail: result.stdout,
                stderrTail: result.stderr
            }
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_COMPLIANCE_RUN_ERROR');
    } finally {
        complianceRunInProgress = false;
    }
};

// GET /api/admin/backup/export
const exportTenantBackup = async (req, res) => {
    try {
        const tenantUsers = await getTenantUsers(req.user.id);
        const tenantUserIds = getTenantUserIds(tenantUsers);
        const inventoryOwnerId = req.user.id;
        const [settings, categories, purchases, transactions, bills, goals, users] = await Promise.all([
            AppSetting.findOne({ user: inventoryOwnerId }).lean(),
            Category.find({ user: inventoryOwnerId }).lean(),
            Purchase.find({ user: inventoryOwnerId }).lean(),
            Transaction.find({ user: inventoryOwnerId }).lean(),
            Bill.find({ user: inventoryOwnerId }).lean(),
            Goal.find({ user: inventoryOwnerId }).lean(),
            User.find({ _id: { $in: tenantUserIds } }).select('_id name email role ownerAdmin createdAt updatedAt').lean()
        ]);

        const data = buildBackupDataPayload({
            settings,
            categories,
            purchases,
            transactions,
            bills,
            goals,
            users
        });
        const encryptedBackup = encryptBackupPayload(data);
        if (!encryptedBackup) {
            return sendError(res, 500, 'Backup encryption key is not configured', 'BACKUP_ENCRYPTION_KEY_MISSING');
        }
        const checksum = computeBackupChecksum(data);
        const response = {
            exportedAt: new Date().toISOString(),
            version: BACKUP_SCHEMA_VERSION,
            tenantAdminId: String(req.user.id),
            checksum,
            encrypted: true,
            encryptedBackup
        };
        await AuditLog.create({
            user: req.user.id,
            action: 'BACKUP_EXPORT',
            entityType: 'backup',
            entityId: String(req.user.id),
            status: 'success',
            details: {
                version: BACKUP_SCHEMA_VERSION,
                checksum,
                encrypted: true,
                counts: {
                    categories: data.categories.length,
                    purchases: data.purchases.length,
                    transactions: data.transactions.length,
                    goals: data.goals.length,
                    bills: data.bills.length
                }
            },
            ip: String(req.ip || ''),
            userAgent: String(req.get?.('user-agent') || '')
        });
        return res.json(response);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'ADMIN_BACKUP_EXPORT_ERROR');
    }
};

// POST /api/admin/backup/validate
const validateTenantBackup = async (req, res) => {
    try {
        const { payload, encrypted } = resolveBackupDataPayload(req);
        const expectedChecksum = String(req.body?.checksum || payload?.checksum || '').trim();
        const includeBills = parseBooleanFlag(req.body?.includeBills);

        const incomingSettings = payload?.settings || null;
        const incomingCategories = Array.isArray(payload?.categories) ? payload.categories : [];
        const incomingPurchases = Array.isArray(payload?.purchases) ? payload.purchases : [];
        const incomingTransactions = Array.isArray(payload?.transactions)
            ? payload.transactions
            : (Array.isArray(payload?.entries) ? payload.entries : []);
        const incomingGoals = Array.isArray(payload?.goals) ? payload.goals : [];
        const incomingBills = Array.isArray(payload?.bills) ? payload.bills : [];
        const incomingUsers = Array.isArray(payload?.users) ? payload.users : [];

        const dataForChecksum = buildBackupDataPayload({
            settings: incomingSettings,
            categories: incomingCategories,
            purchases: incomingPurchases,
            transactions: incomingTransactions,
            bills: incomingBills,
            goals: incomingGoals,
            users: incomingUsers
        });
        const computedChecksum = computeBackupChecksum(dataForChecksum);

        const maxRecordsPerCollection = Math.max(Number(process.env.BACKUP_IMPORT_MAX_RECORDS || 20000), 1000);
        const sizeWarnings = [];
        const checks = [
            ['categories', incomingCategories.length],
            ['purchases', incomingPurchases.length],
            ['transactions', incomingTransactions.length],
            ['goals', incomingGoals.length],
            ['bills', incomingBills.length]
        ];
        checks.forEach(([label, count]) => {
            if (count > maxRecordsPerCollection) {
                sizeWarnings.push(`${label} count ${count} exceeds configured max ${maxRecordsPerCollection}`);
            }
        });

        const checksumMatched = expectedChecksum ? (computedChecksum && computedChecksum === expectedChecksum) : false;
        const valid = sizeWarnings.length === 0 && (!expectedChecksum || checksumMatched);
        return res.json({
            valid,
            version: BACKUP_SCHEMA_VERSION,
            encrypted,
            checksum: {
                provided: expectedChecksum || null,
                computed: computedChecksum || null,
                matched: checksumMatched
            },
            counts: {
                users: incomingUsers.length,
                categories: incomingCategories.length,
                purchases: incomingPurchases.length,
                transactions: incomingTransactions.length,
                goals: incomingGoals.length,
                bills: includeBills ? incomingBills.length : 0
            },
            warnings: sizeWarnings,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.log(error);
        if (String(error?.message || '').toLowerCase().includes('disabled')) {
            return sendError(res, 400, 'Plaintext backup payload is disabled', 'BACKUP_PLAINTEXT_DISABLED');
        }
        if (String(error?.message || '').toLowerCase().includes('encryption key')) {
            return sendError(res, 500, 'Backup encryption key is not configured', 'BACKUP_ENCRYPTION_KEY_MISSING');
        }
        return sendError(res, 500, 'Server Error', 'ADMIN_BACKUP_VALIDATE_ERROR');
    }
};

// POST /api/admin/backup/import
const importTenantBackup = async (req, res) => {
    try {
        const { payload, encrypted } = resolveBackupDataPayload(req);
        const inventoryOwnerId = req.user.id;
        const replaceExisting = parseBooleanFlag(req.body?.replaceExisting);
        const includeBills = parseBooleanFlag(req.body?.includeBills);
        const expectedChecksum = String(req.body?.checksum || payload?.checksum || '').trim();
        const skipChecksumValidation = parseBooleanFlag(req.body?.skipChecksumValidation);

        const incomingSettings = payload?.settings || null;
        const incomingCategories = Array.isArray(payload?.categories) ? payload.categories : [];
        const incomingPurchases = Array.isArray(payload?.purchases) ? payload.purchases : [];
        const incomingTransactions = Array.isArray(payload?.transactions)
            ? payload.transactions
            : (Array.isArray(payload?.entries) ? payload.entries : []);
        const incomingGoals = Array.isArray(payload?.goals) ? payload.goals : [];
        const incomingBills = Array.isArray(payload?.bills) ? payload.bills : [];

        const dataForChecksum = buildBackupDataPayload({
            settings: incomingSettings,
            categories: incomingCategories,
            purchases: incomingPurchases,
            transactions: incomingTransactions,
            bills: incomingBills,
            goals: incomingGoals,
            users: Array.isArray(payload?.users) ? payload.users : []
        });
        const computedChecksum = computeBackupChecksum(dataForChecksum);
        if (!skipChecksumValidation && expectedChecksum) {
            if (!computedChecksum || computedChecksum !== expectedChecksum) {
                return sendError(res, 400, 'Backup checksum mismatch. Import aborted.', 'ADMIN_BACKUP_CHECKSUM_MISMATCH');
            }
        }

        const maxRecordsPerCollection = Math.max(Number(process.env.BACKUP_IMPORT_MAX_RECORDS || 20000), 1000);
        if (
            incomingCategories.length > maxRecordsPerCollection ||
            incomingPurchases.length > maxRecordsPerCollection ||
            incomingTransactions.length > maxRecordsPerCollection ||
            incomingGoals.length > maxRecordsPerCollection ||
            (includeBills && incomingBills.length > maxRecordsPerCollection)
        ) {
            return sendError(res, 400, 'Backup exceeds safe import size limit', 'ADMIN_BACKUP_SIZE_LIMIT_EXCEEDED');
        }

        if (replaceExisting) {
            await Promise.all([
                Category.deleteMany({ user: inventoryOwnerId }),
                Purchase.deleteMany({ user: inventoryOwnerId }),
                Transaction.deleteMany({ user: inventoryOwnerId }),
                Goal.deleteMany({ user: inventoryOwnerId }),
                includeBills ? Bill.deleteMany({ user: inventoryOwnerId }) : Promise.resolve()
            ]);
        }

        if (incomingSettings) {
            await AppSetting.findOneAndUpdate(
                { user: inventoryOwnerId },
                {
                    $set: {
                        businessName: String(incomingSettings.businessName || 'Pharmacy').trim(),
                        businessPan: String(incomingSettings.businessPan || '').trim(),
                        businessAddress: String(incomingSettings.businessAddress || '').trim(),
                        defaultVatRate: Math.max(Math.min(Number(incomingSettings.defaultVatRate) || 13, 100), 0),
                        receiptFooter: String(incomingSettings.receiptFooter || '').trim(),
                        printerType: ['thermal_80mm', 'a4', 'other'].includes(String(incomingSettings.printerType || '').trim())
                            ? String(incomingSettings.printerType || '').trim()
                            : 'thermal_80mm'
                    },
                    $setOnInsert: { user: inventoryOwnerId }
                },
                { upsert: true, new: true }
            );
        }

        let importedCategories = 0;
        for (const item of incomingCategories) {
            const name = String(item?.name || '').trim();
            if (!name) continue;
            // eslint-disable-next-line no-await-in-loop
            await Category.findOneAndUpdate(
                { user: inventoryOwnerId, name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
                {
                    $set: {
                        ...item,
                        _id: undefined,
                        user: inventoryOwnerId,
                        name
                    }
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
            importedCategories += 1;
        }

        let importedPurchases = 0;
        for (const item of incomingPurchases) {
            const purchaseNumber = String(item?.purchaseNumber || '').trim();
            if (!purchaseNumber) continue;
            // eslint-disable-next-line no-await-in-loop
            await Purchase.findOneAndUpdate(
                { user: inventoryOwnerId, purchaseNumber },
                {
                    $set: {
                        ...item,
                        _id: undefined,
                        user: inventoryOwnerId,
                        createdBy: req.user.id,
                        purchaseNumber
                    }
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
            importedPurchases += 1;
        }

        let importedTransactions = 0;
        for (const item of incomingTransactions) {
            const title = String(item?.title || '').trim();
            if (!title) continue;
            // eslint-disable-next-line no-await-in-loop
            await Transaction.findOneAndUpdate(
                {
                    user: inventoryOwnerId,
                    title,
                    date: item?.date ? new Date(item.date) : null,
                    amount: Number(item?.amount || 0),
                    type: String(item?.type || 'outflow')
                },
                {
                    $set: {
                        ...item,
                        _id: undefined,
                        user: inventoryOwnerId
                    }
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
            importedTransactions += 1;
        }

        let importedGoals = 0;
        for (const item of incomingGoals) {
            const title = String(item?.title || '').trim();
            if (!title) continue;
            // eslint-disable-next-line no-await-in-loop
            await Goal.findOneAndUpdate(
                { user: inventoryOwnerId, title },
                {
                    $set: {
                        ...item,
                        _id: undefined,
                        user: inventoryOwnerId,
                        title
                    }
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
            importedGoals += 1;
        }

        let importedBills = 0;
        if (includeBills) {
            for (const item of incomingBills) {
                const billNumber = String(item?.billNumber || '').trim();
                if (!billNumber) continue;
                // eslint-disable-next-line no-await-in-loop
                await Bill.findOneAndUpdate(
                    { user: inventoryOwnerId, billNumber },
                    {
                        $set: {
                            ...item,
                            _id: undefined,
                            user: inventoryOwnerId,
                            billNumber
                        }
                    },
                    { upsert: true, setDefaultsOnInsert: true, allowSensitiveBillUpdate: true }
                );
                importedBills += 1;
            }
        }

        const importSummary = {
            message: 'Backup imported',
            imported: {
                settings: Boolean(incomingSettings),
                categories: importedCategories,
                purchases: importedPurchases,
                transactions: importedTransactions,
                goals: importedGoals,
                bills: importedBills
            }
        };
        await AuditLog.create({
            user: req.user.id,
            action: 'BACKUP_IMPORT',
            entityType: 'backup',
            entityId: String(req.user.id),
            status: 'success',
            details: {
                replaceExisting,
                includeBills,
                encrypted,
                checksumProvided: Boolean(expectedChecksum),
                checksumValidated: Boolean(expectedChecksum) && !skipChecksumValidation,
                imported: importSummary.imported
            },
            ip: String(req.ip || ''),
            userAgent: String(req.get?.('user-agent') || '')
        });
        return res.json(importSummary);
    } catch (error) {
        console.log(error);
        if (String(error?.message || '').toLowerCase().includes('disabled')) {
            return sendError(res, 400, 'Plaintext backup payload is disabled', 'BACKUP_PLAINTEXT_DISABLED');
        }
        if (String(error?.message || '').toLowerCase().includes('encryption key')) {
            return sendError(res, 500, 'Backup encryption key is not configured', 'BACKUP_ENCRYPTION_KEY_MISSING');
        }
        try {
            await AuditLog.create({
                user: req.user?.id || null,
                action: 'BACKUP_IMPORT',
                entityType: 'backup',
                entityId: String(req.user?.id || ''),
                status: 'failure',
                details: { message: String(error?.message || 'Unknown error') },
                ip: String(req.ip || ''),
                userAgent: String(req.get?.('user-agent') || '')
            });
        } catch (auditError) {
            console.log('Failed to write backup import failure audit:', auditError.message);
        }
        return sendError(res, 500, 'Server Error', 'ADMIN_BACKUP_IMPORT_ERROR');
    }
};

module.exports = {
    getUsers,
    getLoginEvents,
    getAuditLogs,
    getOpsMetrics,
    getReleaseReadiness,
    runReleaseGateNow,
    runComplianceReadinessNow,
    getExpiredOverrideAudit,
    exportTenantBackup,
    validateTenantBackup,
    importTenantBackup,
    createUserByAdmin,
    updateUserRoleByAdmin,
    deleteUserByAdmin,
    cleanupCategoryDuplicatesForAllUsers,
    seedRandomEntriesForAdmin
};


