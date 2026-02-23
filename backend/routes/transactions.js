const express = require('express');
const router = express.Router();
const {
    addTransaction,
    getTransactions,
    updateTransaction,
    getRecurringAlerts,
    processRecurringDue,
    generateRecurringTransaction,
    deleteTransaction
} = require('../controllers/transactionController');
const { getInsights, getDashboardSummary } = require('../controllers/insightController');
const { protect, allowAction } = require('../middleware/authMiddleware');
const { ACTIONS } = require('../config/rbacPolicy');
const { createIpRateLimiter } = require('../middleware/rateLimit');

const analyticsLimiter = createIpRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Too many analytics requests. Please try again shortly.',
    code: 'ANALYTICS_RATE_LIMITED'
});

router.post('/transactions', protect, allowAction(ACTIONS.TRANSACTIONS_MANAGE), addTransaction);
router.get('/transactions', protect, allowAction(ACTIONS.TRANSACTIONS_MANAGE), getTransactions);
router.get('/transactions/recurring-alerts', protect, allowAction(ACTIONS.TRANSACTIONS_MANAGE), getRecurringAlerts);
router.post('/transactions/process-recurring-due', protect, allowAction(ACTIONS.TRANSACTIONS_MANAGE), processRecurringDue);
router.get('/transactions/insights', protect, analyticsLimiter, allowAction(ACTIONS.TRANSACTIONS_MANAGE), getInsights);
router.get('/dashboard/summary', protect, analyticsLimiter, allowAction(ACTIONS.MEDICINE_VIEW), getDashboardSummary);
router.put('/transactions/:id', protect, allowAction(ACTIONS.TRANSACTIONS_MANAGE), updateTransaction);
router.post('/transactions/:id/generate-recurring', protect, allowAction(ACTIONS.TRANSACTIONS_MANAGE), generateRecurringTransaction);
router.delete('/transactions/:id', protect, allowAction(ACTIONS.TRANSACTIONS_DELETE), deleteTransaction);

module.exports = router;
