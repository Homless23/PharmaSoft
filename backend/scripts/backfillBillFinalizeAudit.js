const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const Bill = require('../models/Bill');
const AuditLog = require('../models/AuditLog');

const DEFAULT_LIMIT = 5000;
const parseArgNumber = (flag, fallback) => {
    const idx = process.argv.findIndex((arg) => arg === flag);
    if (idx < 0) return fallback;
    const parsed = Number(process.argv[idx + 1]);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const run = async () => {
    const limit = Math.min(Math.max(parseArgNumber('--limit', DEFAULT_LIMIT), 1), 50000);
    const dryRun = process.argv.includes('--dry-run');

    await mongoose.connect(process.env.MONGO_URI);

    const bills = await Bill.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id user billNumber billDate createdAt grandTotal items')
        .lean();

    let scanned = 0;
    let inserted = 0;
    const missing = [];

    for (const bill of bills) {
        scanned += 1;
        const billId = String(bill?._id || '').trim();
        const billNumber = String(bill?.billNumber || '').trim();
        const userId = bill?.user || null;
        if (!billId || !billNumber) continue;

        // eslint-disable-next-line no-await-in-loop
        const existing = await AuditLog.exists({
            action: 'BILL_FINALIZE',
            status: 'success',
            $or: [
                { entityId: billId },
                { 'details.billNumber': billNumber }
            ]
        });
        if (existing) continue;

        missing.push({ billId, billNumber, userId: String(userId || '') });
        if (dryRun) continue;

        // eslint-disable-next-line no-await-in-loop
        await AuditLog.create({
            user: userId,
            action: 'BILL_FINALIZE',
            entityType: 'bill',
            entityId: billId,
            status: 'success',
            details: {
                billNumber,
                grandTotal: Number(bill?.grandTotal || 0),
                itemCount: Array.isArray(bill?.items) ? bill.items.length : 0,
                source: 'backfill_bill_finalize_audit'
            },
            ip: '',
            userAgent: 'system-backfill'
        });
        inserted += 1;
    }

    console.log('Backfill BILL_FINALIZE audit summary:', {
        scanned,
        missingCount: missing.length,
        inserted,
        dryRun
    });
    if (missing.length) {
        console.log('Missing sample (top 20):');
        console.log(missing.slice(0, 20));
    }

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('backfillBillFinalizeAudit failed:', error.message);
    try {
        await mongoose.disconnect();
    } catch (_disconnectError) {}
    process.exit(1);
});

