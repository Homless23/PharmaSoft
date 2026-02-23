const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const Bill = require('../models/Bill');
const AuditLog = require('../models/AuditLog');

const DEFAULT_DAYS = 180;
const DEFAULT_LIMIT = 10000;
const EPSILON = 0.05;
const COMPLIANCE_STATUS_FILE = path.join(process.cwd(), 'runtime', 'compliance-readiness-status.json');

const parseArgNumber = (flag, fallback) => {
    const idx = process.argv.findIndex((arg) => arg === flag);
    if (idx < 0) return fallback;
    const parsed = Number(process.argv[idx + 1]);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const round2 = (value) => Number((Number(value || 0)).toFixed(2));
const toIdString = (value) => String(value || '').trim();

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
    return {
        fiscalYear: match[1],
        seq: Number(match[2]),
        billNumber: raw
    };
};

const summarizeFindings = (label, findings, severity = 'warning') => ({
    label,
    severity,
    count: findings.length,
    sample: findings.slice(0, 20)
});
const persistReport = (report) => {
    try {
        fs.mkdirSync(path.dirname(COMPLIANCE_STATUS_FILE), { recursive: true });
        fs.writeFileSync(COMPLIANCE_STATUS_FILE, JSON.stringify(report, null, 2));
    } catch (error) {
        console.log(`Failed to persist compliance status: ${error.message}`);
    }
};

const run = async () => {
    const days = Math.max(parseArgNumber('--days', DEFAULT_DAYS), 1);
    const limit = Math.min(Math.max(parseArgNumber('--limit', DEFAULT_LIMIT), 100), 50000);
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    await mongoose.connect(process.env.MONGO_URI);

    const bills = await Bill.find({ createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id user billNumber fiscalYear invoiceSequence billDate items subtotal discountPercent discountAmount taxPercent taxAmount grandTotal status voidedAt voidedBy voidReason prescriptionRecord prescriptionStatus expiredOverride createdAt')
        .lean();

    const duplicateInvoiceGroups = await Bill.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
            $group: {
                _id: { user: '$user', billNumber: '$billNumber' },
                count: { $sum: 1 }
            }
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 100 }
    ]);

    const auditLogs = await AuditLog.find({
        createdAt: { $gte: since },
        action: { $in: ['BILL_FINALIZE', 'BILL_VOID'] },
        status: 'success'
    })
        .select('user action entityId details createdAt')
        .lean();

    const finalizeLogEntityIds = new Set();
    const finalizeLogBillNumbers = new Set();
    const voidLogEntityIds = new Set();
    const voidLogBillNumbers = new Set();
    for (const log of auditLogs) {
        const entityId = toIdString(log.entityId);
        const billNumber = toIdString(log?.details?.billNumber);
        if (log.action === 'BILL_FINALIZE') {
            if (entityId) finalizeLogEntityIds.add(entityId);
            if (billNumber) finalizeLogBillNumbers.add(billNumber);
        }
        if (log.action === 'BILL_VOID') {
            if (entityId) voidLogEntityIds.add(entityId);
            if (billNumber) voidLogBillNumbers.add(billNumber);
        }
    }

    const arithmeticIssues = [];
    const fiscalYearIssues = [];
    const invoiceFormatWarnings = [];
    const invoiceSequenceIssues = [];
    const rxIssues = [];
    const overrideIssues = [];
    const voidIssues = [];
    const finalizeAuditMissing = [];
    const voidAuditMissing = [];

    const sequenceSeen = new Set();

    for (const bill of bills) {
        const billId = toIdString(bill._id);
        const billNumber = toIdString(bill.billNumber);
        const status = String(bill.status || 'finalized');

        const itemSubtotal = round2((bill.items || []).reduce((sum, item) => sum + Number(item?.amount || 0), 0));
        const subtotal = round2(bill.subtotal);
        const discountPercent = Math.max(Number(bill.discountPercent || 0), 0);
        const discountAmountExpected = round2(subtotal * (discountPercent / 100));
        const discountAmount = round2(bill.discountAmount);
        const taxable = round2(Math.max(subtotal - discountAmount, 0));
        const taxExpected = round2(taxable * (Math.max(Number(bill.taxPercent || 0), 0) / 100));
        const taxAmount = round2(bill.taxAmount);
        const grandExpected = round2(taxable + taxAmount);
        const grandTotal = round2(bill.grandTotal);

        if (
            Math.abs(itemSubtotal - subtotal) > EPSILON ||
            Math.abs(discountAmountExpected - discountAmount) > EPSILON ||
            Math.abs(taxExpected - taxAmount) > EPSILON ||
            Math.abs(grandExpected - grandTotal) > EPSILON
        ) {
            arithmeticIssues.push({
                billId,
                billNumber,
                subtotal,
                itemSubtotal,
                discountAmount,
                discountAmountExpected,
                taxAmount,
                taxExpected,
                grandTotal,
                grandExpected
            });
        }

        const parsedIrd = parseIrdNumber(billNumber);
        if (!parsedIrd) {
            invoiceFormatWarnings.push({ billId, billNumber, reason: 'NOT_IRD_FORMAT' });
        } else {
            const derivedFy = getNepalFiscalYear(bill.billDate);
            if (parsedIrd.fiscalYear !== derivedFy || toIdString(bill.fiscalYear) !== derivedFy) {
                fiscalYearIssues.push({
                    billId,
                    billNumber,
                    modelFiscalYear: toIdString(bill.fiscalYear),
                    derivedFiscalYear: derivedFy
                });
            }
            const seqField = Number(bill.invoiceSequence || 0);
            if (seqField > 0 && seqField !== parsedIrd.seq) {
                invoiceSequenceIssues.push({
                    billId,
                    billNumber,
                    seqInNumber: parsedIrd.seq,
                    seqInField: seqField
                });
            }
            const seqKey = `${toIdString(bill.user)}::${parsedIrd.fiscalYear}::${parsedIrd.seq}`;
            if (sequenceSeen.has(seqKey)) {
                invoiceSequenceIssues.push({
                    billId,
                    billNumber,
                    reason: 'DUPLICATE_SEQUENCE_PER_FISCAL_YEAR'
                });
            }
            sequenceSeen.add(seqKey);
        }

        if (String(bill?.prescriptionRecord?.mode || 'none') === 'none' && String(bill?.prescriptionStatus || 'pending') === 'verified') {
            rxIssues.push({
                billId,
                billNumber,
                reason: 'VERIFIED_WITHOUT_PRESCRIPTION_RECORD'
            });
        }

        if (bill?.expiredOverride?.approved) {
            const hasApprover = Boolean(bill?.expiredOverride?.approvedBy || toIdString(bill?.expiredOverride?.approvedByEmail));
            const hasToken = Boolean(bill?.expiredOverride?.tokenId);
            if (!hasApprover || !hasToken) {
                overrideIssues.push({
                    billId,
                    billNumber,
                    hasApprover,
                    hasToken
                });
            }
        }

        if (status === 'voided') {
            if (!bill.voidedAt || !bill.voidedBy || !toIdString(bill.voidReason)) {
                voidIssues.push({
                    billId,
                    billNumber,
                    voidedAt: bill.voidedAt || null,
                    voidedBy: toIdString(bill.voidedBy),
                    voidReason: toIdString(bill.voidReason)
                });
            }
        }

        if (!finalizeLogEntityIds.has(billId) && !finalizeLogBillNumbers.has(billNumber)) {
            finalizeAuditMissing.push({ billId, billNumber });
        }
        if (status === 'voided') {
            if (!voidLogEntityIds.has(billId) && !voidLogBillNumbers.has(billNumber)) {
                voidAuditMissing.push({ billId, billNumber });
            }
        }
    }

    const critical = [
        summarizeFindings('Duplicate invoice numbers per tenant', duplicateInvoiceGroups, 'critical'),
        summarizeFindings('Bill arithmetic mismatches', arithmeticIssues, 'critical'),
        summarizeFindings('Fiscal year mismatches', fiscalYearIssues, 'critical'),
        summarizeFindings('Invoice sequence mismatches/duplicates', invoiceSequenceIssues, 'critical'),
        summarizeFindings('Missing BILL_FINALIZE audit entries', finalizeAuditMissing, 'critical'),
        summarizeFindings('Missing BILL_VOID audit entries', voidAuditMissing, 'critical')
    ];
    const warnings = [
        summarizeFindings('Non-IRD invoice format bills', invoiceFormatWarnings, 'warning'),
        summarizeFindings('Prescription verification inconsistencies', rxIssues, 'warning'),
        summarizeFindings('Expired override metadata inconsistencies', overrideIssues, 'warning'),
        summarizeFindings('Voided bill metadata issues', voidIssues, 'warning')
    ];

    const criticalCount = critical.reduce((sum, item) => sum + Number(item.count || 0), 0);
    const warningCount = warnings.reduce((sum, item) => sum + Number(item.count || 0), 0);

    const report = {
        generatedAt: new Date().toISOString(),
        windowDays: days,
        scannedBills: bills.length,
        scannedAuditLogs: auditLogs.length,
        criticalCount,
        warningCount,
        critical,
        warnings
    };

    console.log('Compliance readiness report summary:', {
        generatedAt: report.generatedAt,
        windowDays: report.windowDays,
        scannedBills: report.scannedBills,
        scannedAuditLogs: report.scannedAuditLogs,
        criticalCount: report.criticalCount,
        warningCount: report.warningCount
    });
    console.log(report);
    persistReport(report);

    await mongoose.disconnect();
    if (criticalCount > 0) {
        process.exitCode = 2;
    }
};

run().catch(async (error) => {
    console.error('complianceReadinessReport failed:', error.message);
    try {
        await mongoose.disconnect();
    } catch (_disconnectError) {}
    process.exit(1);
});
