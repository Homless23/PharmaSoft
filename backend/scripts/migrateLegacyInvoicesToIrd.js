const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const Bill = require('../models/Bill');
const InvoiceCounter = require('../models/InvoiceCounter');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');

const DEFAULT_LIMIT = 50000;

const parseArgNumber = (flag, fallback) => {
    const idx = process.argv.findIndex((arg) => arg === flag);
    if (idx < 0) return fallback;
    const parsed = Number(process.argv[idx + 1]);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getNepalFiscalYear = (dateValue) => {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const startsNewFiscalYear = month > 7 || (month === 7 && day >= 16);
    const fyStart = startsNewFiscalYear ? year : year - 1;
    const fyEndShort = String((fyStart + 1) % 100).padStart(2, '0');
    return `${fyStart}-${fyEndShort}`;
};

const parseIrdNumber = (billNumber) => {
    const raw = String(billNumber || '').trim();
    const match = /^IRD-(\d{4}-\d{2})-(\d{6})$/i.exec(raw);
    if (!match) return null;
    return { fiscalYear: match[1], seq: Number(match[2]) };
};

const padSeq = (seq) => String(Math.max(Number(seq) || 0, 0)).padStart(6, '0');

const run = async () => {
    const limit = Math.min(Math.max(parseArgNumber('--limit', DEFAULT_LIMIT), 1), 100000);
    const dryRun = process.argv.includes('--dry-run');

    await mongoose.connect(process.env.MONGO_URI);

    const bills = await Bill.find({})
        .sort({ user: 1, billDate: 1, createdAt: 1, _id: 1 })
        .limit(limit)
        .select('_id user billNumber billDate createdAt fiscalYear invoiceSequence grandTotal items')
        .lean();

    const usedNumbersByUser = new Map();
    const maxSeqByUserFy = new Map();
    const allUserFyTouched = new Set();

    for (const bill of bills) {
        const userId = String(bill.user || '').trim();
        const billNumber = String(bill.billNumber || '').trim();
        if (!userId || !billNumber) continue;

        if (!usedNumbersByUser.has(userId)) usedNumbersByUser.set(userId, new Set());
        usedNumbersByUser.get(userId).add(billNumber);

        const parsed = parseIrdNumber(billNumber);
        if (!parsed) continue;
        const key = `${userId}::${parsed.fiscalYear}`;
        const current = Number(maxSeqByUserFy.get(key) || 0);
        maxSeqByUserFy.set(key, Math.max(current, parsed.seq, Number(bill.invoiceSequence || 0)));
        allUserFyTouched.add(key);
    }

    const plans = [];
    for (const bill of bills) {
        const userId = String(bill.user || '').trim();
        const oldBillNumber = String(bill.billNumber || '').trim();
        if (!userId || !oldBillNumber) continue;
        if (parseIrdNumber(oldBillNumber)) continue;

        const fiscalYear = getNepalFiscalYear(bill.billDate || bill.createdAt || new Date());
        const userSet = usedNumbersByUser.get(userId) || new Set();
        const key = `${userId}::${fiscalYear}`;
        let nextSeq = Number(maxSeqByUserFy.get(key) || 0) + 1;
        let newBillNumber = `IRD-${fiscalYear}-${padSeq(nextSeq)}`;
        while (userSet.has(newBillNumber)) {
            nextSeq += 1;
            newBillNumber = `IRD-${fiscalYear}-${padSeq(nextSeq)}`;
        }

        maxSeqByUserFy.set(key, nextSeq);
        userSet.add(newBillNumber);
        usedNumbersByUser.set(userId, userSet);
        allUserFyTouched.add(key);

        plans.push({
            billId: String(bill._id),
            userId,
            oldBillNumber,
            newBillNumber,
            fiscalYear,
            invoiceSequence: nextSeq
        });
    }

    let updatedBills = 0;
    let updatedTransactions = 0;
    let auditRows = 0;

    if (!dryRun) {
        for (const plan of plans) {
            // eslint-disable-next-line no-await-in-loop
            await Bill.updateOne(
                { _id: plan.billId },
                {
                    $set: {
                        billNumber: plan.newBillNumber,
                        fiscalYear: plan.fiscalYear,
                        invoiceSequence: plan.invoiceSequence
                    }
                },
                { allowSensitiveBillUpdate: true }
            );
            updatedBills += 1;

            // eslint-disable-next-line no-await-in-loop
            const txBill = await Transaction.updateMany(
                { user: plan.userId, title: `Bill ${plan.oldBillNumber}` },
                { $set: { title: `Bill ${plan.newBillNumber}` } }
            );
            // eslint-disable-next-line no-await-in-loop
            const txVoid = await Transaction.updateMany(
                { user: plan.userId, title: `Bill Void ${plan.oldBillNumber}` },
                { $set: { title: `Bill Void ${plan.newBillNumber}` } }
            );
            updatedTransactions += Number(txBill.modifiedCount || 0) + Number(txVoid.modifiedCount || 0);

            // eslint-disable-next-line no-await-in-loop
            await AuditLog.create({
                user: plan.userId,
                action: 'BILL_NUMBER_MIGRATION',
                entityType: 'bill',
                entityId: plan.billId,
                status: 'success',
                details: {
                    from: plan.oldBillNumber,
                    to: plan.newBillNumber,
                    fiscalYear: plan.fiscalYear,
                    invoiceSequence: plan.invoiceSequence
                },
                ip: '',
                userAgent: 'system-migration'
            });
            auditRows += 1;
        }

        for (const userFy of allUserFyTouched) {
            const [userId, fiscalYear] = userFy.split('::');
            const seq = Number(maxSeqByUserFy.get(userFy) || 0);
            if (!userId || !fiscalYear || seq <= 0) continue;
            // eslint-disable-next-line no-await-in-loop
            await InvoiceCounter.findOneAndUpdate(
                { user: userId, fiscalYear },
                { $max: { seq } },
                { upsert: true, new: true }
            );
        }
    }

    console.log('Legacy invoice migration summary:', {
        scanned: bills.length,
        candidates: plans.length,
        updatedBills,
        updatedTransactions,
        auditRows,
        dryRun
    });
    if (plans.length) {
        console.log('Planned changes (top 20):');
        console.log(plans.slice(0, 20));
    }

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('migrateLegacyInvoicesToIrd failed:', error.message);
    try {
        await mongoose.disconnect();
    } catch (_disconnectError) {}
    process.exit(1);
});

