const mongoose = require('mongoose');
const crypto = require('crypto');
const Bill = require('../models/Bill');
const InvoiceCounter = require('../models/InvoiceCounter');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const ExpiredOverrideToken = require('../models/ExpiredOverrideToken');
const AppSetting = require('../models/AppSetting');
const { writeAuditLog } = require('../utils/auditLog');
const { sendError } = require('../utils/apiResponse');
const DEFAULT_VAT_RATE = Math.max(Number(process.env.DEFAULT_VAT_RATE || 13) || 0, 0);
const getInventoryOwnerId = (req) => String(req.user?.ownerAdmin || req.user?.id || req.user?._id || '');
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const canAccessBillForTenant = (billUserId, req) => {
    const ownerId = getInventoryOwnerId(req);
    const actorId = String(req.user?.id || req.user?._id || '');
    const safeBillUserId = String(billUserId || '');
    return safeBillUserId === ownerId || safeBillUserId === actorId;
};

const parseDateOrNull = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const normalizeBatches = (batches) => {
    if (!Array.isArray(batches)) return [];
    return batches
        .map((batch) => ({
            batchNumber: String(batch?.batchNumber || '').trim(),
            expiryDate: parseDateOrNull(batch?.expiryDate),
            qty: Math.max(Number(batch?.qty) || 0, 0)
        }))
        .filter((batch) => batch.batchNumber && batch.expiryDate && batch.qty > 0);
};
const summarizeStockFromBatches = (batches) => {
    const safe = normalizeBatches(batches);
    const stockQty = safe.reduce((sum, batch) => sum + Number(batch.qty || 0), 0);
    const nextExpiry = safe
        .map((batch) => batch.expiryDate)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || null;
    const nextBatch = safe.find((batch) => String(batch.expiryDate) === String(nextExpiry)) || null;
    return {
        batches: safe,
        stockQty,
        expiryDate: nextExpiry,
        batchNumber: nextBatch?.batchNumber || ''
    };
};
const consumeBatchesFefo = (batches, qtyToConsume) => {
    const remainingBatches = normalizeBatches(batches)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    const allocations = [];
    let remaining = Math.max(Number(qtyToConsume) || 0, 0);
    for (const batch of remainingBatches) {
        if (remaining <= 0) break;
        const available = Number(batch.qty || 0);
        if (available <= 0) continue;
        const used = Math.min(available, remaining);
        batch.qty = available - used;
        remaining -= used;
        allocations.push({
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            qty: used
        });
    }
    if (remaining > 0) {
        return { ok: false, allocations: [], batches: normalizeBatches(remainingBatches) };
    }
    return { ok: true, allocations, batches: normalizeBatches(remainingBatches) };
};

const normalizeCustomerKey = (value) => String(value || '').trim();

const toCustomerKey = ({ customerName, customerPhone, customerKey }) => {
    const explicit = normalizeCustomerKey(customerKey);
    if (explicit) return explicit;
    const cleanedName = String(customerName || '').trim().toLowerCase();
    const cleanedPhone = String(customerPhone || '').replace(/\s+/g, '');
    if (cleanedName && cleanedPhone) return `${cleanedName}::${cleanedPhone}`;
    if (cleanedName) return cleanedName;
    if (cleanedPhone) return cleanedPhone;
    return 'walk-in-customer';
};

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.statusCode = status;
    return error;
};
const toCodeError = (status, message, code) => {
    const error = createHttpError(status, message);
    error.errorCode = code;
    return error;
};
const hashOverrideToken = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const generateOverrideToken = () => {
    const raw = crypto.randomBytes(12).toString('base64url').toUpperCase();
    return `OVR-${raw}`;
};
const sanitizeExpiredOverride = (payload) => ({
    token: String(payload?.token || '').trim(),
    reason: String(payload?.reason || '').trim()
});
const consumeExpiredOverrideToken = async (payload, { session, billNumber, usedBy }) => {
    const safe = sanitizeExpiredOverride(payload);
    if (!safe.token) {
        throw toCodeError(400, 'Expired medicine detected. Admin override required.', 'EXPIRED_OVERRIDE_REQUIRED');
    }
    const tokenHash = hashOverrideToken(safe.token);
    const tokenDoc = await ExpiredOverrideToken.findOne({
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() }
    }).session(session);
    if (!tokenDoc) {
        throw toCodeError(401, 'Invalid or expired override token', 'INVALID_OVERRIDE_TOKEN');
    }
    tokenDoc.usedAt = new Date();
    tokenDoc.usedBy = usedBy || null;
    tokenDoc.usedForBill = String(billNumber || '').trim();
    await tokenDoc.save({ session });
    return {
        approvedBy: tokenDoc.issuedBy,
        approvedByEmail: tokenDoc.issuedByEmail,
        reason: safe.reason || tokenDoc.reason || '',
        tokenId: tokenDoc._id
    };
};

const getNepalFiscalYear = (dateValue) => {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    // Approximate Nepal fiscal cutoff around mid-July (Shrawan start).
    const startsNewFiscalYear = month > 7 || (month === 7 && day >= 16);
    const fyStart = startsNewFiscalYear ? year : year - 1;
    const fyEndShort = String((fyStart + 1) % 100).padStart(2, '0');
    return `${fyStart}-${fyEndShort}`;
};

const padInvoiceSequence = (value) => String(Math.max(Number(value) || 0, 0)).padStart(6, '0');

const generateIrdInvoiceNumber = async ({ userId, billDate, session }) => {
    const fiscalYear = getNepalFiscalYear(billDate);
    const counter = await InvoiceCounter.findOneAndUpdate(
        { user: userId, fiscalYear },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session, setDefaultsOnInsert: true }
    );
    const invoiceSequence = Number(counter?.seq || 0);
    const billNumber = `IRD-${fiscalYear}-${padInvoiceSequence(invoiceSequence)}`;
    return { fiscalYear, invoiceSequence, billNumber };
};

const sanitizeBillItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => {
            const qty = Math.max(Number(item?.qty) || 0, 0);
            const rate = Math.max(Number(item?.rate) || 0, 0);
            const amount = Number((qty * rate).toFixed(2));
            return {
                medicineId: item?.medicineId || null,
                medicineName: String(item?.medicineName || '').trim(),
                batchNumber: String(item?.batchNumber || '').trim(),
                qty,
                rate,
                amount
            };
        })
        .filter((item) => item.medicineId && item.medicineName && item.qty > 0);
};

const sanitizePrescriptionRecord = (payload) => {
    const mode = String(payload?.mode || 'none').trim().toLowerCase();
    const doctorName = String(payload?.doctorName || '').trim();
    const doctorLicense = String(payload?.doctorLicense || '').trim();
    const digitalText = String(payload?.digitalText || '').trim();
    const imageDataUrl = String(payload?.imageDataUrl || '').trim();

    if (!['none', 'image', 'digital'].includes(mode)) {
        throw createHttpError(400, 'Invalid prescription mode');
    }

    if (mode === 'digital' && !digitalText) {
        throw createHttpError(400, 'Digital prescription text is required');
    }
    if (mode === 'image') {
        if (!imageDataUrl) {
            throw createHttpError(400, 'Prescription image is required');
        }
        if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageDataUrl)) {
            throw createHttpError(400, 'Unsupported prescription image format');
        }
        // Keep payload bounded to avoid oversized DB records.
        if (imageDataUrl.length > 1200000) {
            throw createHttpError(400, 'Prescription image is too large');
        }
    }

    return {
        mode,
        imageDataUrl: mode === 'image' ? imageDataUrl : '',
        digitalText: mode === 'digital' ? digitalText : '',
        doctorName,
        doctorLicense,
        attachedAt: mode === 'none' ? null : new Date()
    };
};

exports.createBill = async (req, res) => {
    // Legacy endpoint now routes through the same safe transactional flow.
    return exports.finalizeBill(req, res);
};

exports.issueExpiredOverrideToken = async (req, res) => {
    try {
        const requestedMinutes = Number(req.body?.ttlMinutes || 10);
        const ttlMinutes = Math.min(Math.max(Math.floor(requestedMinutes), 1), 30);
        const reason = String(req.body?.reason || '').trim();
        const token = generateOverrideToken();
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
        await ExpiredOverrideToken.create({
            tokenHash: hashOverrideToken(token),
            issuedBy: req.user.id,
            issuedByEmail: String(req.user?.email || '').trim().toLowerCase(),
            reason,
            expiresAt
        });

        await writeAuditLog({
            req,
            userId: req.user.id,
            action: 'EXPIRED_OVERRIDE_TOKEN_ISSUE',
            entityType: 'override_token',
            entityId: String(req.user.id),
            status: 'success',
            details: { ttlMinutes, reason, expiresAt }
        });

        return res.status(201).json({ token, expiresAt, ttlMinutes });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'EXPIRED_OVERRIDE_TOKEN_ERROR');
    }
};

exports.finalizeBill = async (req, res) => {
    const session = await mongoose.startSession();
    let safeClientRequestId = '';
    const inventoryOwnerId = getInventoryOwnerId(req);
    try {
        const {
            billNumber,
            billDate,
            customerName,
            customerKey,
            customerPhone,
            customerPan,
            paymentMethod,
            paymentReference,
            prescriptionRecord,
            items,
            clientRequestId,
            discountPercent,
            vatApplicable,
            expiredOverride
        } = req.body || {};

        const requestedBillNumber = String(billNumber || '').trim();
        const headerIdempotencyKey = String(
            req.get('idempotency-key') || req.get('x-idempotency-key') || ''
        ).trim();
        safeClientRequestId = String(clientRequestId || headerIdempotencyKey).trim();
        const parsedDate = parseDateOrNull(billDate);
        const billItems = sanitizeBillItems(items);
        const safeDiscountPercent = Math.max(Number(discountPercent) || 0, 0);
        const safeVatApplicable = vatApplicable !== false;
        const settings = await AppSetting.findOne({ user: inventoryOwnerId }).lean();
        const configuredVatRate = Math.max(
            Number(settings?.defaultVatRate ?? DEFAULT_VAT_RATE) || DEFAULT_VAT_RATE,
            0
        );
        const safeTaxPercent = safeVatApplicable ? configuredVatRate : 0;
        const cleanedCustomerName = String(customerName || '').trim();
        const cleanedCustomerPhone = String(customerPhone || '').trim();
        const cleanedCustomerPan = String(customerPan || '').trim();
        const cleanedPaymentMethod = ['cash', 'esewa', 'khalti', 'other'].includes(String(paymentMethod || '').trim().toLowerCase())
            ? String(paymentMethod || '').trim().toLowerCase()
            : 'cash';
        const cleanedPaymentReference = String(paymentReference || '').trim();
        const safePrescriptionRecord = sanitizePrescriptionRecord(prescriptionRecord);
        const safeExpiredOverride = sanitizeExpiredOverride(expiredOverride);
        const cleanedCustomerKey = toCustomerKey({
            customerName: cleanedCustomerName,
            customerPhone: cleanedCustomerPhone,
            customerKey
        });
        const sellerName = String(settings?.businessName || process.env.BUSINESS_NAME || 'Pharmacy').trim();
        const sellerPan = String(settings?.businessPan || process.env.BUSINESS_PAN || '').trim();
        const sellerAddress = String(settings?.businessAddress || process.env.BUSINESS_ADDRESS || '').trim();

        if (!parsedDate) {
            return sendError(res, 400, 'Valid bill date is required', 'BILL_INVALID_DATE');
        }
        if (!billItems.length) {
            return sendError(res, 400, 'At least one valid bill item is required', 'BILL_ITEMS_REQUIRED');
        }
        if (safeClientRequestId.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
            return sendError(
                res,
                400,
                `Idempotency key must be ${MAX_IDEMPOTENCY_KEY_LENGTH} characters or less`,
                'IDEMPOTENCY_KEY_INVALID'
            );
        }
        if (requestedBillNumber) {
            const existingByBillNumber = await Bill.findOne({
                user: inventoryOwnerId,
                billNumber: requestedBillNumber
            });
            if (existingByBillNumber) {
                return res.status(200).json({ bill: existingByBillNumber, idempotent: true });
            }
        }
        if (safeClientRequestId) {
            const existingByRequest = await Bill.findOne({
                user: inventoryOwnerId,
                clientRequestId: safeClientRequestId
            });
            if (existingByRequest) {
                return res.status(200).json({ bill: existingByRequest, idempotent: true });
            }
        }

        const subtotal = Number(
            billItems.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2)
        );
        const discountAmount = Number((subtotal * (safeDiscountPercent / 100)).toFixed(2));
        const taxableAmount = Math.max(subtotal - discountAmount, 0);
        const taxAmount = Number((taxableAmount * (safeTaxPercent / 100)).toFixed(2));
        const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

        let createdBill = null;
        let createdIncome = null;
        let stockAdjustments = [];
        let expiredOverrideAudit = null;
        let expiredOverrideLines = [];
        let finalBillNumber = requestedBillNumber;
        let fiscalYear = '';
        let invoiceSequence = 0;

        await session.withTransaction(async () => {
            if (!finalBillNumber) {
                const generated = await generateIrdInvoiceNumber({
                    userId: inventoryOwnerId,
                    billDate: parsedDate,
                    session
                });
                finalBillNumber = generated.billNumber;
                fiscalYear = generated.fiscalYear;
                invoiceSequence = generated.invoiceSequence;
            } else {
                fiscalYear = getNepalFiscalYear(parsedDate);
            }
            const normalizedItems = [];
            stockAdjustments = [];
            const rxRequiredMedicines = [];
            for (const item of billItems) {
                const medicine = await Category.findOne({
                    _id: item.medicineId,
                    user: inventoryOwnerId
                }).session(session);

                if (!medicine) {
                    throw createHttpError(400, `Medicine not found for line item: ${item.medicineName}`);
                }
                if (medicine.prescriptionRequired) {
                    rxRequiredMedicines.push({
                        medicineName: medicine.name,
                        regulatoryClass: String(medicine.regulatoryClass || 'none')
                    });
                }

                const availableStock = Number(medicine.stockQty || 0);
                if (Number(item.qty) > availableStock) {
                    await writeAuditLog({
                        req,
                        userId: req.user.id,
                        action: 'BILL_FINALIZE',
                        entityType: 'bill',
                        entityId: finalBillNumber,
                        status: 'failure',
                        details: {
                            reason: 'INSUFFICIENT_STOCK',
                            medicineId: String(medicine._id),
                            medicineName: medicine.name,
                            requestedQty: Number(item.qty),
                            availableStock
                        }
                    });
                    throw createHttpError(400, `Insufficient stock for ${medicine.name}`);
                }

                const consumeResult = consumeBatchesFefo(medicine.batches, Number(item.qty));
                if (!consumeResult.ok) {
                    throw createHttpError(400, `Insufficient stock in available batches for ${medicine.name}`);
                }
                const expiredAllocations = consumeResult.allocations.filter((allocation) => {
                    const expiry = parseDateOrNull(allocation?.expiryDate);
                    return expiry && expiry.getTime() < Date.now();
                });
                if (expiredAllocations.length) {
                    if (!expiredOverrideAudit) {
                        expiredOverrideAudit = await consumeExpiredOverrideToken(safeExpiredOverride, {
                            session,
                            billNumber: finalBillNumber,
                            usedBy: req.user.id
                        });
                    }
                    expiredOverrideLines.push({
                        medicineId: String(medicine._id),
                        medicineName: medicine.name,
                        allocations: expiredAllocations.map((allocation) => ({
                            batchNumber: String(allocation.batchNumber || '').trim(),
                            expiryDate: allocation.expiryDate,
                            qty: Number(allocation.qty || 0)
                        }))
                    });
                }
                const batchSummary = summarizeStockFromBatches(consumeResult.batches);
                medicine.batches = batchSummary.batches;
                medicine.stockQty = batchSummary.stockQty;
                medicine.expiryDate = batchSummary.expiryDate;
                medicine.batchNumber = batchSummary.batchNumber;
                await medicine.save({ session });
                stockAdjustments.push({
                    medicineId: String(medicine._id),
                    medicineName: medicine.name,
                    before: availableStock,
                    soldQty: Number(item.qty),
                    after: Number(medicine.stockQty),
                    batchAllocations: consumeResult.allocations
                });

                const soldBatchNumbers = consumeResult.allocations.map((allocation) => allocation.batchNumber);
                normalizedItems.push({
                    medicineId: medicine._id,
                    medicineName: medicine.name,
                    batchNumber: soldBatchNumbers.join(', '),
                    qty: Number(item.qty),
                    rate: Number(item.rate),
                    amount: Number(item.amount),
                    costRate: Number(medicine.unitPrice || 0),
                    costAmount: Number((Number(item.qty) * Number(medicine.unitPrice || 0)).toFixed(2)),
                    profitAmount: Number((Number(item.amount) - (Number(item.qty) * Number(medicine.unitPrice || 0))).toFixed(2)),
                    batchAllocations: consumeResult.allocations
                });
            }

            if (rxRequiredMedicines.length) {
                const hasValidPrescription = safePrescriptionRecord.mode !== 'none';
                if (!hasValidPrescription) {
                    const names = rxRequiredMedicines.map((item) => item.medicineName).join(', ');
                    throw createHttpError(400, `Prescription is required for: ${names}`);
                }
            }

            createdIncome = await Transaction.create([{
                title: `Bill ${finalBillNumber}`,
                amount: Number(grandTotal.toFixed(2)),
                type: 'income',
                category: 'Retail Sales',
                description: `Billed to ${cleanedCustomerName || 'Walk-in Customer'} (${normalizedItems.length} items)`,
                date: parsedDate,
                user: inventoryOwnerId
            }], { session });

            createdBill = await Bill.create([{
                user: inventoryOwnerId,
                billNumber: finalBillNumber,
                clientRequestId: safeClientRequestId,
                billDate: parsedDate,
                customerName: cleanedCustomerName,
                customerKey: cleanedCustomerKey,
                customerPhone: cleanedCustomerPhone,
                paymentMethod: cleanedPaymentMethod,
                paymentReference: cleanedPaymentReference,
                customerPan: cleanedCustomerPan,
                prescriptionRecord: safePrescriptionRecord,
                items: normalizedItems,
                subtotal,
                discountPercent: safeDiscountPercent,
                discountAmount,
                vatApplicable: safeVatApplicable,
                taxPercent: safeTaxPercent,
                taxAmount,
                grandTotal,
                fiscalYear,
                invoiceSequence,
                sellerName,
                sellerPan,
                sellerAddress,
                expiredOverride: expiredOverrideAudit ? {
                    approved: true,
                    approvedAt: new Date(),
                    approvedBy: expiredOverrideAudit.approvedBy,
                    approvedByEmail: expiredOverrideAudit.approvedByEmail,
                    reason: expiredOverrideAudit.reason,
                    tokenId: expiredOverrideAudit.tokenId,
                    lines: expiredOverrideLines
                } : undefined
            }], { session });
        });

        await writeAuditLog({
            req,
            userId: req.user.id,
            action: 'BILL_FINALIZE',
            entityType: 'bill',
            entityId: createdBill?.[0]?._id || finalBillNumber,
            status: 'success',
            details: {
                billNumber: finalBillNumber,
                grandTotal,
                itemCount: Array.isArray(createdBill?.[0]?.items) ? createdBill[0].items.length : 0,
                stockAdjustments
            }
        });

        return res.status(201).json({
            bill: createdBill?.[0] || null,
            incomeEntry: createdIncome?.[0] || null
        });
    } catch (error) {
        if (error?.statusCode) {
            return sendError(res, error.statusCode, error.message, error.errorCode || 'BILL_OPERATION_FAILED');
        }
        if (error?.name === 'ValidationError') {
            const firstMessage = Object.values(error.errors || {})[0]?.message || 'Validation failed';
            return sendError(res, 400, firstMessage, 'BILL_VALIDATION_FAILED');
        }
        if (error?.name === 'CastError') {
            return sendError(res, 400, `Invalid value for ${String(error.path || 'field')}`, 'BILL_INVALID_FIELD');
        }
        if (error?.code === 11000) {
            if (safeClientRequestId) {
                const existingByRequest = await Bill.findOne({
                    user: inventoryOwnerId,
                    clientRequestId: safeClientRequestId
                });
                if (existingByRequest) {
                    return res.status(200).json({ bill: existingByRequest, idempotent: true });
                }
            }
            await writeAuditLog({
                req,
                userId: req.user?.id || null,
                action: 'BILL_FINALIZE',
                entityType: 'bill',
                entityId: String(req.body?.billNumber || ''),
                status: 'failure',
                details: { reason: 'DUPLICATE_BILL_NUMBER' }
            });
            return sendError(res, 409, 'Invoice number conflict. Please retry finalize bill.', 'BILL_DUPLICATE_INVOICE');
        }
        await writeAuditLog({
            req,
            userId: req.user?.id || null,
            action: 'BILL_FINALIZE',
            entityType: 'bill',
            entityId: String(req.body?.billNumber || ''),
            status: 'failure',
            details: { reason: 'SERVER_ERROR', message: error?.message || 'unknown' }
        });
        console.log(error);
        const includeDebug = String(process.env.NODE_ENV || '').trim().toLowerCase() !== 'production';
        return sendError(
            res,
            500,
            'Server Error',
            'BILL_SERVER_ERROR',
            includeDebug ? { debugMessage: String(error?.message || 'unknown') } : {}
        );
    } finally {
        await session.endSession();
    }
};

exports.getBills = async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 500);
        const customerKey = normalizeCustomerKey(req.query?.customerKey);
        const includeVoided = String(req.query?.includeVoided || 'false').trim().toLowerCase() === 'true';
        const query = { user: inventoryOwnerId };
        if (customerKey) {
            query.customerKey = customerKey;
        }
        if (!includeVoided) {
            query.status = { $ne: 'voided' };
        }

        const bills = await Bill.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);
        return res.json(bills);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'BILL_LIST_ERROR');
    }
};

exports.getEndOfDayReport = async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const dateInput = String(req.query?.date || '').trim();
        const targetDate = dateInput ? new Date(`${dateInput}T00:00:00.000Z`) : new Date();
        if (Number.isNaN(targetDate.getTime())) {
            return sendError(res, 400, 'Invalid date format. Use YYYY-MM-DD', 'REPORT_INVALID_DATE');
        }
        const start = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));
        const end = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

        const bills = await Bill.find({
            user: inventoryOwnerId,
            status: { $ne: 'voided' },
            billDate: { $gte: start, $lte: end }
        }).select('billNumber billDate grandTotal paymentMethod items');
        const salesTransactions = await Transaction.find({
            user: inventoryOwnerId,
            type: 'income',
            date: { $gte: start, $lte: end },
            title: /^Bill\s+/i
        }).select('title amount date');

        const totals = bills.reduce((acc, bill) => {
            const amount = Number(bill.grandTotal || 0);
            const method = String(bill.paymentMethod || 'cash').toLowerCase();
            if (method === 'cash') acc.cashCollected += amount;
            if (method === 'esewa' || method === 'khalti') acc.digitalCollected += amount;
            const billProfit = (bill.items || []).reduce((sum, item) => sum + Number(item?.profitAmount || 0), 0);
            acc.totalProfit += billProfit;
            acc.billCount += 1;
            return acc;
        }, {
            cashCollected: 0,
            digitalCollected: 0,
            totalProfit: 0,
            billCount: 0
        });
        const transactionIncomeTotal = salesTransactions.reduce(
            (sum, tx) => sum + Number(tx.amount || 0),
            0
        );
        const billTotal = Number((totals.cashCollected + totals.digitalCollected).toFixed(2));
        const incomeTotalRounded = Number(transactionIncomeTotal.toFixed(2));
        const variance = Number((incomeTotalRounded - billTotal).toFixed(2));

        return res.json({
            date: start.toISOString().slice(0, 10),
            totals: {
                cashCollected: Number(totals.cashCollected.toFixed(2)),
                digitalCollected: Number(totals.digitalCollected.toFixed(2)),
                totalProfit: Number(totals.totalProfit.toFixed(2)),
                billCount: totals.billCount
            },
            reconciliation: {
                billSalesTotal: billTotal,
                ledgerIncomeTotal: incomeTotalRounded,
                variance,
                inSync: Math.abs(variance) < 0.01,
                incomeEntryCount: salesTransactions.length
            },
            bills
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'REPORT_GENERATION_ERROR');
    }
};

exports.getBillCustomers = async (req, res) => {
    try {
        const inventoryOwnerId = new mongoose.Types.ObjectId(getInventoryOwnerId(req));
        const rows = await Bill.aggregate([
            { $match: { user: inventoryOwnerId, status: { $ne: 'voided' } } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$customerKey',
                    customerKey: { $first: '$customerKey' },
                    customerName: { $first: '$customerName' },
                    customerPhone: { $first: '$customerPhone' },
                    latestBillDate: { $first: '$billDate' },
                    purchases: { $sum: 1 },
                    totalSpent: { $sum: '$grandTotal' }
                }
            },
            { $sort: { latestBillDate: -1 } },
            { $limit: 500 }
        ]);
        return res.json(rows);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'BILL_CUSTOMERS_ERROR');
    }
};

exports.getBillById = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);
        if (!bill) return sendError(res, 404, 'Bill not found', 'BILL_NOT_FOUND');
        if (!canAccessBillForTenant(bill.user, req)) {
            return sendError(res, 401, 'User not authorized', 'BILL_UNAUTHORIZED');
        }
        return res.json(bill);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'BILL_FETCH_ERROR');
    }
};

exports.deleteBill = async (req, res) => {
    const session = await mongoose.startSession();
    const inventoryOwnerId = getInventoryOwnerId(req);
    try {
        if (String(req.user?.role || '').toLowerCase() !== 'admin') {
            return sendError(res, 403, 'Admin access required', 'ADMIN_REQUIRED');
        }
        const bill = await Bill.findById(req.params.id);
        if (!bill) return sendError(res, 404, 'Bill not found', 'BILL_NOT_FOUND');
        if (!canAccessBillForTenant(bill.user, req)) {
            return sendError(res, 401, 'User not authorized', 'BILL_UNAUTHORIZED');
        }
        if (String(bill.status || 'finalized') === 'voided') {
            return sendError(res, 400, 'Bill is already voided', 'BILL_ALREADY_VOIDED');
        }
        const voidReason = String(req.body?.reason || '').trim() || 'Admin void action';

        const stockRestorations = [];
        await session.withTransaction(async () => {
            const currentBill = await Bill.findById(req.params.id).session(session);
            if (!currentBill) {
                throw createHttpError(404, 'Bill not found');
            }
            if (String(currentBill.status || 'finalized') === 'voided') {
                throw createHttpError(400, 'Bill is already voided');
            }

            for (const item of currentBill.items || []) {
                const medicine = await Category.findOne({
                    _id: item.medicineId,
                    user: inventoryOwnerId
                }).session(session);
                if (!medicine) {
                    throw createHttpError(400, `Medicine not found for restore: ${item.medicineName || 'Unknown'}`);
                }
                const before = Number(medicine.stockQty || 0);
                const allocations = Array.isArray(item.batchAllocations) ? item.batchAllocations : [];
                for (const allocation of allocations) {
                    const batchNumber = String(allocation?.batchNumber || '').trim();
                    const expiryDate = parseDateOrNull(allocation?.expiryDate);
                    const qty = Math.max(Number(allocation?.qty) || 0, 0);
                    if (!batchNumber || !expiryDate || qty <= 0) continue;
                    const existingBatch = Array.isArray(medicine.batches)
                        ? medicine.batches.find((batch) => {
                            const existingBatchNumber = String(batch?.batchNumber || '').trim();
                            const existingExpiry = parseDateOrNull(batch?.expiryDate);
                            return existingBatchNumber === batchNumber
                                && existingExpiry
                                && existingExpiry.getTime() === expiryDate.getTime();
                        })
                        : null;
                    if (existingBatch) {
                        existingBatch.qty = Math.max(Number(existingBatch.qty || 0), 0) + qty;
                    } else {
                        medicine.batches = Array.isArray(medicine.batches) ? medicine.batches : [];
                        medicine.batches.push({ batchNumber, expiryDate, qty });
                    }
                }

                const batchSummary = summarizeStockFromBatches(medicine.batches);
                medicine.batches = batchSummary.batches;
                medicine.stockQty = batchSummary.stockQty;
                medicine.expiryDate = batchSummary.expiryDate;
                medicine.batchNumber = batchSummary.batchNumber;
                await medicine.save({ session });
                stockRestorations.push({
                    medicineId: String(medicine._id),
                    medicineName: medicine.name,
                    before,
                    restoredQty: Number(item.qty || 0),
                    after: Number(medicine.stockQty || 0)
                });
            }

            currentBill.$locals = currentBill.$locals || {};
            currentBill.$locals.allowSensitiveBillUpdate = true;
            currentBill.status = 'voided';
            currentBill.voidReason = voidReason;
            currentBill.voidedAt = new Date();
            currentBill.voidedBy = req.user.id;
            await currentBill.save({ session });

            await Transaction.create([{
                title: `Bill Void ${currentBill.billNumber}`,
                amount: Number(currentBill.grandTotal || 0),
                type: 'outflow',
                category: 'Sales Reversal',
                description: `Voided bill ${currentBill.billNumber}. Reason: ${voidReason}`,
                date: new Date(),
                user: inventoryOwnerId
            }], { session });
        });

        await writeAuditLog({
            req,
            userId: req.user.id,
            action: 'BILL_VOID',
            entityType: 'bill',
            entityId: bill._id,
            status: 'success',
            details: {
                billNumber: bill.billNumber,
                grandTotal: Number(bill.grandTotal || 0),
                itemCount: Array.isArray(bill.items) ? bill.items.length : 0,
                reason: voidReason,
                stockRestorations
            }
        });
        return res.json({ message: 'Bill voided safely' });
    } catch (error) {
        if (error?.statusCode) {
            return sendError(res, error.statusCode, error.message, 'BILL_VOID_FAILED');
        }
        console.log(error);
        return sendError(res, 500, 'Server Error', 'BILL_SERVER_ERROR');
    } finally {
        await session.endSession();
    }
};

exports.verifyPrescription = async (req, res) => {
    try {
        const role = String(req.user?.role || '').toLowerCase();
        if (!['admin', 'pharmacist'].includes(role)) {
            return sendError(res, 403, 'Only admin or pharmacist can verify prescriptions', 'PRESCRIPTION_VERIFY_FORBIDDEN');
        }

        const bill = await Bill.findById(req.params.id);
        if (!bill) return sendError(res, 404, 'Bill not found', 'BILL_NOT_FOUND');
        if (!canAccessBillForTenant(bill.user, req)) {
            return sendError(res, 401, 'User not authorized', 'BILL_UNAUTHORIZED');
        }

        const requestedStatus = String(req.body?.status || 'verified').trim().toLowerCase();
        if (!['verified', 'rejected', 'pending'].includes(requestedStatus)) {
            return sendError(res, 400, 'Invalid prescription status', 'PRESCRIPTION_STATUS_INVALID');
        }

        bill.prescriptionStatus = requestedStatus;
        bill.prescriptionNote = String(req.body?.note || '').trim();
        if (requestedStatus === 'verified' || requestedStatus === 'rejected') {
            bill.prescriptionVerifiedBy = req.user.id;
            bill.prescriptionVerifiedAt = new Date();
        } else {
            bill.prescriptionVerifiedBy = null;
            bill.prescriptionVerifiedAt = null;
        }

        await bill.save();
        await writeAuditLog({
            req,
            userId: req.user.id,
            action: 'PRESCRIPTION_VERIFY',
            entityType: 'bill',
            entityId: bill._id,
            status: 'success',
            details: {
                billNumber: bill.billNumber,
                prescriptionStatus: bill.prescriptionStatus,
                note: bill.prescriptionNote
            }
        });
        return res.json(bill);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'PRESCRIPTION_VERIFY_ERROR');
    }
};

