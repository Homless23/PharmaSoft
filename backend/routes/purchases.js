const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { protect, allowAction } = require('../middleware/authMiddleware');
const { ACTIONS } = require('../config/rbacPolicy');
const Purchase = require('../models/Purchase');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { writeAuditLog } = require('../utils/auditLog');
const { sendError } = require('../utils/apiResponse');

const router = express.Router();

const getInventoryOwnerId = (req) => String(req.user?.ownerAdmin || req.user?.id || req.user?._id || '');
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
const generatePurchaseNumber = () => `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;

router.post(
    '/purchases',
    protect,
    allowAction(ACTIONS.STOCK_MANAGE),
    [body('supplierName', 'supplierName is required').isLength({ min: 1 }).trim()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const inventoryOwnerId = getInventoryOwnerId(req);
            const supplierName = String(req.body?.supplierName || '').trim();
            const supplierInvoiceNumber = String(req.body?.supplierInvoiceNumber || '').trim();
            const purchaseDate = parseDateOrNull(req.body?.purchaseDate) || new Date();
            const notes = String(req.body?.notes || '').trim();
            const amountPaid = Math.max(Number(req.body?.amountPaid || 0), 0);
            const purchaseNumber = String(req.body?.purchaseNumber || '').trim() || generatePurchaseNumber();
            const inputItems = Array.isArray(req.body?.items) ? req.body.items : [];
            if (!inputItems.length) {
                return sendError(res, 400, 'At least one purchase item is required', 'PURCHASE_ITEMS_REQUIRED');
            }

            const normalizedItems = [];
            for (const item of inputItems) {
                const medicineId = String(item?.medicineId || '').trim();
                const qty = Math.max(Math.floor(Number(item?.qty) || 0), 0);
                const costRate = Math.max(Number(item?.costRate || 0), 0);
                const batchNumber = String(item?.batchNumber || '').trim();
                const expiryDate = parseDateOrNull(item?.expiryDate);
                if (!medicineId || !qty || !batchNumber || !expiryDate) {
                    return sendError(
                        res,
                        400,
                        'Each item requires medicineId, qty, batchNumber, and expiryDate',
                        'PURCHASE_ITEM_INVALID'
                    );
                }
                const medicine = await Category.findOne({ _id: medicineId, user: inventoryOwnerId });
                if (!medicine) {
                    return sendError(res, 400, 'Invalid medicine in purchase items', 'PURCHASE_MEDICINE_INVALID');
                }
                normalizedItems.push({
                    medicineId: medicine._id,
                    medicineName: medicine.name,
                    batchNumber,
                    expiryDate,
                    qty,
                    costRate,
                    lineTotal: Number((qty * costRate).toFixed(2))
                });
            }

            const subtotal = Number(
                normalizedItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0).toFixed(2)
            );
            const outstanding = Math.max(Number((subtotal - amountPaid).toFixed(2)), 0);
            const paymentStatus = outstanding <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');

            const purchase = await Purchase.create({
                user: inventoryOwnerId,
                createdBy: req.user.id,
                purchaseNumber,
                supplierName,
                supplierInvoiceNumber,
                purchaseDate,
                status: 'draft',
                paymentStatus,
                amountPaid: Number(amountPaid.toFixed(2)),
                subtotal,
                notes,
                items: normalizedItems
            });

            await writeAuditLog({
                req,
                userId: req.user.id,
                action: 'PURCHASE_CREATE',
                entityType: 'purchase',
                entityId: purchase._id,
                status: 'success',
                details: { purchaseNumber: purchase.purchaseNumber, supplierName, subtotal }
            });
            return res.status(201).json(purchase);
        } catch (error) {
            if (error?.code === 11000) {
                return sendError(res, 409, 'Duplicate purchase number', 'PURCHASE_NUMBER_CONFLICT');
            }
            console.error(error.message);
            return sendError(res, 500, 'Internal Server Error', 'PURCHASE_CREATE_ERROR');
        }
    }
);

router.get('/purchases', protect, allowAction(ACTIONS.STOCK_MANAGE), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const rows = await Purchase.find({ user: inventoryOwnerId }).sort({ createdAt: -1 }).limit(500);
        return res.json(rows);
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'PURCHASE_LIST_ERROR');
    }
});

router.post('/purchases/:id/receive', protect, allowAction(ACTIONS.STOCK_MANAGE), async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        let updatedPurchase = null;
        await session.withTransaction(async () => {
            const purchase = await Purchase.findOne({ _id: req.params.id, user: inventoryOwnerId }).session(session);
            if (!purchase) {
                throw new Error('NOT_FOUND');
            }
            if (purchase.status === 'received') {
                updatedPurchase = purchase;
                return;
            }
            if (purchase.status === 'cancelled') {
                throw new Error('CANCELLED');
            }

            for (const line of purchase.items) {
                const medicine = await Category.findOne({ _id: line.medicineId, user: inventoryOwnerId }).session(session);
                if (!medicine) {
                    throw new Error(`MEDICINE_NOT_FOUND:${line.medicineId}`);
                }
                const currentBatches = normalizeBatches(medicine.batches);
                const existingIndex = currentBatches.findIndex((batch) =>
                    batch.batchNumber.toLowerCase() === String(line.batchNumber || '').toLowerCase()
                    && new Date(batch.expiryDate).toISOString().slice(0, 10) === new Date(line.expiryDate).toISOString().slice(0, 10)
                );
                if (existingIndex >= 0) {
                    currentBatches[existingIndex].qty = Number(currentBatches[existingIndex].qty || 0) + Number(line.qty || 0);
                } else {
                    currentBatches.push({
                        batchNumber: String(line.batchNumber || '').trim(),
                        expiryDate: line.expiryDate,
                        qty: Number(line.qty || 0)
                    });
                }
                const summary = summarizeStockFromBatches(currentBatches);
                medicine.batches = summary.batches;
                medicine.stockQty = summary.stockQty;
                medicine.expiryDate = summary.expiryDate;
                medicine.batchNumber = summary.batchNumber;
                await medicine.save({ session });
            }

            purchase.status = 'received';
            purchase.receivedAt = new Date();
            purchase.receivedBy = req.user.id;
            updatedPurchase = await purchase.save({ session });

            await Transaction.create([{
                user: inventoryOwnerId,
                title: `Purchase ${purchase.purchaseNumber}`,
                amount: Number(purchase.subtotal || 0),
                type: 'outflow',
                category: 'Medicine Procurement',
                description: `Supplier ${purchase.supplierName}${purchase.supplierInvoiceNumber ? ` | Invoice ${purchase.supplierInvoiceNumber}` : ''}`,
                date: purchase.purchaseDate
            }], { session });
        });

        await writeAuditLog({
            req,
            userId: req.user.id,
            action: 'PURCHASE_RECEIVE',
            entityType: 'purchase',
            entityId: updatedPurchase?._id || req.params.id,
            status: 'success',
            details: { purchaseId: req.params.id }
        });
        return res.json(updatedPurchase);
    } catch (error) {
        if (String(error?.message || '') === 'NOT_FOUND') {
            return sendError(res, 404, 'Purchase not found', 'PURCHASE_NOT_FOUND');
        }
        if (String(error?.message || '') === 'CANCELLED') {
            return sendError(res, 400, 'Cancelled purchase cannot be received', 'PURCHASE_RECEIVE_CANCELLED');
        }
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'PURCHASE_RECEIVE_ERROR');
    } finally {
        await session.endSession();
    }
});

router.post('/purchases/:id/payment', protect, allowAction(ACTIONS.STOCK_MANAGE), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const addPaid = Math.max(Number(req.body?.amount || 0), 0);
        if (!addPaid) return sendError(res, 400, 'Valid payment amount is required', 'PURCHASE_PAYMENT_AMOUNT_INVALID');
        const purchase = await Purchase.findOne({ _id: req.params.id, user: inventoryOwnerId });
        if (!purchase) return sendError(res, 404, 'Purchase not found', 'PURCHASE_NOT_FOUND');
        const nextPaid = Number((Number(purchase.amountPaid || 0) + addPaid).toFixed(2));
        const subtotal = Number(purchase.subtotal || 0);
        purchase.amountPaid = Math.min(nextPaid, subtotal);
        const outstanding = Math.max(Number((subtotal - purchase.amountPaid).toFixed(2)), 0);
        purchase.paymentStatus = outstanding <= 0 ? 'paid' : (purchase.amountPaid > 0 ? 'partial' : 'unpaid');
        await purchase.save();
        return res.json(purchase);
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'PURCHASE_PAYMENT_ERROR');
    }
});

router.get('/purchases/supplier-ledger', protect, allowAction(ACTIONS.STOCK_MANAGE), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const supplierFilter = String(req.query?.supplier || '').trim().toLowerCase();
        const startDate = parseDateOrNull(req.query?.startDate);
        const endDate = parseDateOrNull(req.query?.endDate);
        if (endDate) {
            endDate.setHours(23, 59, 59, 999);
        }
        const rows = await Purchase.find({ user: inventoryOwnerId }).sort({ createdAt: -1 }).lean();
        const filteredRows = rows.filter((row) => {
            const supplierName = String(row.supplierName || '').trim().toLowerCase();
            if (supplierFilter && !supplierName.includes(supplierFilter)) return false;
            const purchaseDate = parseDateOrNull(row.purchaseDate);
            if (startDate && purchaseDate && purchaseDate < startDate) return false;
            if (endDate && purchaseDate && purchaseDate > endDate) return false;
            return true;
        });
        const filteredIdSet = new Set(filteredRows.map((row) => String(row?._id || '')));
        const grouped = rows.reduce((acc, row) => {
            const supplierName = String(row.supplierName || 'Unknown Supplier').trim() || 'Unknown Supplier';
            const key = supplierName.toLowerCase();
            if (!filteredIdSet.has(String(row?._id || ''))) return acc;
            if (!acc[key]) {
                acc[key] = {
                    supplierName,
                    totalPurchases: 0,
                    totalPaid: 0,
                    outstanding: 0,
                    entries: []
                };
            }
            const subtotal = Number(row.subtotal || 0);
            const paid = Number(row.amountPaid || 0);
            const outstanding = Math.max(Number((subtotal - paid).toFixed(2)), 0);
            acc[key].totalPurchases += subtotal;
            acc[key].totalPaid += paid;
            acc[key].outstanding += outstanding;
            acc[key].entries.push({
                _id: row._id,
                purchaseNumber: row.purchaseNumber,
                supplierInvoiceNumber: row.supplierInvoiceNumber || '',
                purchaseDate: row.purchaseDate,
                status: row.status,
                paymentStatus: row.paymentStatus,
                subtotal,
                amountPaid: paid,
                outstanding
            });
            return acc;
        }, {});
        const suppliers = Object.values(grouped)
            .map((item) => ({
                ...item,
                totalPurchases: Number(item.totalPurchases.toFixed(2)),
                totalPaid: Number(item.totalPaid.toFixed(2)),
                outstanding: Number(item.outstanding.toFixed(2)),
                entries: item.entries.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
            }))
            .sort((a, b) => b.outstanding - a.outstanding);
        const now = Date.now();
        const totals = suppliers.reduce((acc, item) => {
            acc.totalPurchases += Number(item.totalPurchases || 0);
            acc.totalPaid += Number(item.totalPaid || 0);
            acc.totalOutstanding += Number(item.outstanding || 0);
            (item.entries || []).forEach((entry) => {
                const outstanding = Number(entry.outstanding || 0);
                if (outstanding <= 0) return;
                const ageDays = Math.floor((now - new Date(entry.purchaseDate).getTime()) / (24 * 60 * 60 * 1000));
                if (ageDays >= 30) {
                    acc.overdueOutstanding += outstanding;
                    acc.overdueInvoices += 1;
                }
            });
            return acc;
        }, {
            totalPurchases: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            overdueOutstanding: 0,
            overdueInvoices: 0
        });
        const paymentRatio = totals.totalPurchases > 0
            ? Number(((totals.totalPaid / totals.totalPurchases) * 100).toFixed(2))
            : 0;
        return res.json({
            suppliers,
            summary: {
                suppliersCount: suppliers.length,
                totalPurchases: Number(totals.totalPurchases.toFixed(2)),
                totalPaid: Number(totals.totalPaid.toFixed(2)),
                totalOutstanding: Number(totals.totalOutstanding.toFixed(2)),
                overdueOutstanding: Number(totals.overdueOutstanding.toFixed(2)),
                overdueInvoices: totals.overdueInvoices,
                paymentRatio
            }
        });
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'PURCHASE_LEDGER_ERROR');
    }
});

module.exports = router;

