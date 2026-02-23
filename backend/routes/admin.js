const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { createIpRateLimiter } = require('../middleware/rateLimit');
const {
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
} = require('../controllers/adminController');

const adminWriteLimiter = createIpRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 40,
    message: 'Too many admin write operations. Please try again shortly.',
    code: 'ADMIN_WRITE_RATE_LIMITED'
});

const backupImportLimiter = createIpRateLimiter({
    windowMs: 30 * 60 * 1000,
    max: 6,
    message: 'Too many backup import attempts. Please wait before retrying.',
    code: 'BACKUP_IMPORT_RATE_LIMITED'
});

router.get('/users', protect, adminOnly, getUsers);
router.get('/logins', protect, adminOnly, getLoginEvents);
router.get('/audit-logs', protect, adminOnly, getAuditLogs);
router.get('/ops/metrics', protect, adminOnly, getOpsMetrics);
router.get('/ops/release-readiness', protect, adminOnly, getReleaseReadiness);
router.post('/ops/release-gate/run', protect, adminOnly, adminWriteLimiter, runReleaseGateNow);
router.post('/ops/compliance/run', protect, adminOnly, adminWriteLimiter, runComplianceReadinessNow);
router.get('/expired-overrides', protect, adminOnly, getExpiredOverrideAudit);
router.get('/backup/export', protect, adminOnly, exportTenantBackup);
router.post('/backup/validate', protect, adminOnly, adminWriteLimiter, validateTenantBackup);
router.post('/backup/import', protect, adminOnly, backupImportLimiter, importTenantBackup);
router.post('/users', protect, adminOnly, adminWriteLimiter, createUserByAdmin);
router.put('/users/:id/role', protect, adminOnly, adminWriteLimiter, updateUserRoleByAdmin);
router.delete('/users/:id', protect, adminOnly, adminWriteLimiter, deleteUserByAdmin);
router.post('/categories/cleanup-duplicates', protect, adminOnly, adminWriteLimiter, cleanupCategoryDuplicatesForAllUsers);
router.post('/seed-random-entries', protect, adminOnly, adminWriteLimiter, seedRandomEntriesForAdmin);

module.exports = router;
