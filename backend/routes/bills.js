const express = require('express');
const router = express.Router();
const { protect, allowAction, allowRoles } = require('../middleware/authMiddleware');
const { ACTIONS } = require('../config/rbacPolicy');
const { createIpRateLimiter } = require('../middleware/rateLimit');
const { allowOnlyBodyFields } = require('../middleware/requestSchema');
const {
    createBill,
    finalizeBill,
    issueExpiredOverrideToken,
    getBills,
    getEndOfDayReport,
    getBillCustomers,
    getBillById,
    deleteBill,
    verifyPrescription
} = require('../controllers/billController');

const billingWriteLimiter = createIpRateLimiter({
    windowMs: 60 * 1000,
    max: 90,
    message: 'Too many billing write requests. Please retry shortly.',
    code: 'BILLING_WRITE_RATE_LIMITED'
});

const finalizeBillLimiter = createIpRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many bill finalization requests. Please retry shortly.',
    code: 'BILL_FINALIZE_RATE_LIMITED',
    keyBy: (req) => String(req.user?.id || req.user?._id || req.ip || '')
});

const billingReadLimiter = createIpRateLimiter({
    windowMs: 60 * 1000,
    max: 240,
    message: 'Too many billing read requests. Please retry shortly.',
    code: 'BILLING_READ_RATE_LIMITED'
});

const overrideLimiter = createIpRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many expired override token requests. Please retry later.',
    code: 'OVERRIDE_TOKEN_RATE_LIMITED',
    keyBy: (req) => String(req.user?.id || req.user?._id || req.ip || '')
});

router.post('/bills', protect, billingWriteLimiter, allowAction(ACTIONS.BILLING_ACCESS), createBill);
router.post(
    '/bills/finalize',
    protect,
    finalizeBillLimiter,
    allowAction(ACTIONS.BILLING_ACCESS),
    allowOnlyBodyFields([
        'clientRequestId',
        'billNumber',
        'billDate',
        'customerName',
        'customerKey',
        'customerPhone',
        'customerPan',
        'paymentMethod',
        'paymentReference',
        'prescriptionRecord',
        'items',
        'subtotal',
        'discountPercent',
        'discountAmount',
        'vatApplicable',
        'taxPercent',
        'taxAmount',
        'grandTotal',
        'expiredOverride'
    ]),
    finalizeBill
);
router.post('/bills/expired-override-token', protect, overrideLimiter, allowRoles('admin'), allowOnlyBodyFields(['reason', 'ttlMinutes']), issueExpiredOverrideToken);
router.get('/bills', protect, billingReadLimiter, allowAction(ACTIONS.BILLING_ACCESS), getBills);
router.get('/bills/end-of-day', protect, billingReadLimiter, allowAction(ACTIONS.BILLING_ACCESS), getEndOfDayReport);
router.get('/bills/customers', protect, billingReadLimiter, allowAction(ACTIONS.BILLING_ACCESS), getBillCustomers);
router.get('/bills/:id', protect, allowAction(ACTIONS.BILLING_ACCESS), getBillById);
router.put('/bills/:id/verify-prescription', protect, billingWriteLimiter, allowAction(ACTIONS.PRESCRIPTION_VERIFY), allowOnlyBodyFields(['status', 'note']), verifyPrescription);
router.delete('/bills/:id', protect, billingWriteLimiter, allowAction(ACTIONS.BILLING_DELETE), deleteBill);

module.exports = router;
