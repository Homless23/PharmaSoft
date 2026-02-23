const express = require('express');
const router = express.Router();
const { protect, allowRoles, allowAction } = require('../middleware/authMiddleware');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { cleanupCategoryDuplicatesForUser } = require('../utils/categoryCleanup');
const { writeAuditLog } = require('../utils/auditLog');
const { sendError } = require('../utils/apiResponse');
const { body, validationResult } = require('express-validator');
const { ACTIONS } = require('../config/rbacPolicy');
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// ROUTE 1: Get All Categories (e.g., GET /api/v1/categories)
router.get('/categories', protect, allowAction(ACTIONS.MEDICINE_VIEW), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const categories = await Category.find({ user: inventoryOwnerId }).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'CATEGORIES_FETCH_ERROR');
    }
});

// ROUTE 1B: Quick search medicines for billing POS (GET /api/v1/categories/quick-search?q=par)
router.get('/categories/quick-search', protect, allowAction(ACTIONS.MEDICINE_VIEW), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const query = String(req.query?.q || '').trim();
        const limit = Math.min(Math.max(Math.floor(Number(req.query?.limit) || 12), 1), 30);
        if (query.length < 3) {
            return res.json([]);
        }

        const safe = escapeRegex(query);
        const startsWithRegex = new RegExp(`^${safe}`, 'i');
        const containsRegex = new RegExp(safe, 'i');

        const rows = await Category.find({
            user: inventoryOwnerId,
            active: { $ne: false },
            $or: [
                { barcode: query },
                { sku: query },
                { name: startsWithRegex },
                { genericName: startsWithRegex },
                { strength: startsWithRegex },
                { name: containsRegex },
                { genericName: containsRegex }
            ]
        })
            .sort({ stockQty: -1, name: 1 })
            .limit(limit)
            .select('_id name genericName strength barcode sku rackLocation stockQty unitPrice batchNumber expiryDate prescriptionRequired regulatoryClass')
            .lean();

        res.json(rows);
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'CATEGORIES_QUICK_SEARCH_ERROR');
    }
});

// ROUTE 2: Add Category (e.g., POST /api/v1/categories/add)
router.post('/categories/add', protect, allowAction(ACTIONS.MEDICINE_WRITE), [
    body('name', 'Name is required').isLength({ min: 1 }).trim(),
], async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const {
            name, genericName, strength, budget, active, sku, barcode, rackLocation, batchNumber, manufacturer, unitPrice, stockQty, reorderPoint, prescriptionRequired, regulatoryClass, expiryDate, batches
        } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendError(res, 400, 'Validation failed', 'CATEGORY_VALIDATION_ERROR', { errors: errors.array() });
        }

        const normalizedName = String(name || '').trim();
        const budgetNumber = Number(budget) || 0;
        const unitPriceNumber = Math.max(Number(unitPrice) || 0, 0);
        const stockQtyNumber = Math.max(Number(stockQty) || 0, 0);
        const reorderPointNumber = Math.max(Number(reorderPoint) || 0, 0);
        const safeExpiry = parseDateOrNull(expiryDate);
        const seedBatches = normalizeBatches(batches);
        if (!seedBatches.length && batchNumber && safeExpiry && stockQtyNumber > 0) {
            seedBatches.push({
                batchNumber: String(batchNumber || '').trim(),
                expiryDate: safeExpiry,
                qty: stockQtyNumber
            });
        }
        const batchSummary = summarizeStockFromBatches(seedBatches);

        // Check if category already exists for this user
        const existing = await Category.findOne({
            user: inventoryOwnerId,
            name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' }
        });
        if(existing) {
            return sendError(res, 400, 'Category already exists', 'CATEGORY_EXISTS');
        }

        const category = new Category({
            name: normalizedName,
            genericName: String(genericName || '').trim(),
            strength: String(strength || '').trim(),
            budget: budgetNumber,
            sku: String(sku || '').trim(),
            barcode: String(barcode || '').trim(),
            rackLocation: String(rackLocation || '').trim(),
            batchNumber: batchSummary.batchNumber || String(batchNumber || '').trim(),
            manufacturer: String(manufacturer || '').trim(),
            unitPrice: unitPriceNumber,
            stockQty: batchSummary.batches.length ? batchSummary.stockQty : stockQtyNumber,
            reorderPoint: reorderPointNumber,
            prescriptionRequired: Boolean(prescriptionRequired),
            regulatoryClass: ['none', 'schedule_h', 'narcotic', 'psychotropic', 'other'].includes(String(regulatoryClass || '').toLowerCase())
                ? String(regulatoryClass || '').toLowerCase()
                : 'none',
            batches: batchSummary.batches,
            expiryDate: batchSummary.batches.length ? batchSummary.expiryDate : safeExpiry,
            active: active !== false,
            user: inventoryOwnerId
        });
        const savedCategory = await category.save();

        // FIX: Send ONLY the saved category object, no wrappers!
        res.json(savedCategory);

    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'CATEGORY_CREATE_ERROR');
    }
});

// ROUTE 3: Update Category Budget (e.g., PUT /api/v1/categories/:id)
router.put('/categories/:id', protect, allowAction(ACTIONS.MEDICINE_WRITE), async (req, res) => {
    const {
        budget, name, genericName, strength, active, sku, barcode, rackLocation, batchNumber, manufacturer, unitPrice, stockQty, reorderPoint, prescriptionRequired, regulatoryClass, expiryDate, batches
    } = req.body;
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        let category = await Category.findById(req.params.id);
        if(!category) return sendError(res, 404, 'Not Found', 'CATEGORY_NOT_FOUND');
        if(String(category.user) !== inventoryOwnerId) return sendError(res, 401, 'Not Allowed', 'CATEGORY_UNAUTHORIZED');

        const updates = {};
        if (typeof budget !== 'undefined') {
            updates.budget = Number(budget) || 0;
        }
        if (typeof name === 'string') {
            const normalizedName = name.trim();
            if (!normalizedName) {
                return sendError(res, 400, 'Category name is required', 'CATEGORY_NAME_REQUIRED');
            }
            const duplicate = await Category.findOne({
                _id: { $ne: req.params.id },
                user: inventoryOwnerId,
                name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' }
            });
            if (duplicate) {
                return sendError(res, 400, 'Category already exists', 'CATEGORY_EXISTS');
            }
            updates.name = normalizedName;
        }
        if (typeof active !== 'undefined') {
            updates.active = Boolean(active);
        }
        if (typeof genericName !== 'undefined') {
            updates.genericName = String(genericName || '').trim();
        }
        if (typeof strength !== 'undefined') {
            updates.strength = String(strength || '').trim();
        }
        if (typeof sku !== 'undefined') {
            updates.sku = String(sku || '').trim();
        }
        if (typeof barcode !== 'undefined') {
            updates.barcode = String(barcode || '').trim();
        }
        if (typeof rackLocation !== 'undefined') {
            updates.rackLocation = String(rackLocation || '').trim();
        }
        if (typeof batchNumber !== 'undefined') {
            updates.batchNumber = String(batchNumber || '').trim();
        }
        if (typeof manufacturer !== 'undefined') {
            updates.manufacturer = String(manufacturer || '').trim();
        }
        if (typeof unitPrice !== 'undefined') {
            updates.unitPrice = Math.max(Number(unitPrice) || 0, 0);
        }
        if (typeof stockQty !== 'undefined') {
            updates.stockQty = Math.max(Number(stockQty) || 0, 0);
        }
        if (typeof reorderPoint !== 'undefined') {
            updates.reorderPoint = Math.max(Number(reorderPoint) || 0, 0);
        }
        if (typeof prescriptionRequired !== 'undefined') {
            updates.prescriptionRequired = Boolean(prescriptionRequired);
        }
        if (typeof regulatoryClass !== 'undefined') {
            const normalizedClass = String(regulatoryClass || '').toLowerCase();
            updates.regulatoryClass = ['none', 'schedule_h', 'narcotic', 'psychotropic', 'other'].includes(normalizedClass)
                ? normalizedClass
                : 'none';
        }
        if (typeof expiryDate !== 'undefined') {
            if (!expiryDate) {
                updates.expiryDate = null;
            } else {
                const parsedExpiry = new Date(expiryDate);
                if (Number.isNaN(parsedExpiry.getTime())) {
                    return sendError(res, 400, 'Invalid expiry date', 'CATEGORY_EXPIRY_INVALID');
                }
                updates.expiryDate = parsedExpiry;
            }
        }
        if (typeof batches !== 'undefined') {
            const nextBatches = normalizeBatches(batches);
            const summary = summarizeStockFromBatches(nextBatches);
            updates.batches = summary.batches;
            updates.stockQty = summary.stockQty;
            updates.expiryDate = summary.expiryDate;
            updates.batchNumber = summary.batchNumber;
        }

        updates.date = new Date();
        const previousStockQty = Number(category.stockQty || 0);
        const previousBudget = Number(category.budget || 0);
        category = await Category.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
        if (typeof updates.stockQty !== 'undefined') {
            await writeAuditLog({
                req,
                userId: req.user.id,
                action: 'STOCK_UPDATE',
                entityType: 'category',
                entityId: category._id,
                status: 'success',
                details: {
                    medicineName: category.name,
                    before: previousStockQty,
                    after: Number(category.stockQty || 0)
                }
            });
        }
        if (typeof updates.budget !== 'undefined' && Number(updates.budget) !== previousBudget) {
            await writeAuditLog({
                req,
                userId: req.user.id,
                action: 'CATEGORY_BUDGET_UPDATE',
                entityType: 'category',
                entityId: category._id,
                status: 'success',
                details: {
                    medicineName: category.name,
                    before: previousBudget,
                    after: Number(category.budget || 0)
                }
            });
        }
        res.json(category);
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'CATEGORY_UPDATE_ERROR');
    }
});

// ROUTE 4: Delete Category (e.g., DELETE /api/v1/categories/:id)
router.delete('/categories/:id', protect, allowAction(ACTIONS.MEDICINE_DELETE), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const category = await Category.findById(req.params.id);
        if (!category) return sendError(res, 404, 'Not Found', 'CATEGORY_NOT_FOUND');
        if (String(category.user) !== inventoryOwnerId) return sendError(res, 401, 'Not Allowed', 'CATEGORY_UNAUTHORIZED');

        await Category.findByIdAndDelete(req.params.id);
        await writeAuditLog({
            req,
            userId: req.user.id,
            action: 'CATEGORY_DELETE',
            entityType: 'category',
            entityId: category._id,
            status: 'success',
            details: {
                name: category.name,
                stockQty: Number(category.stockQty || 0),
                unitPrice: Number(category.unitPrice || 0)
            }
        });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'CATEGORY_DELETE_ERROR');
    }
});

// ROUTE 5A: Stock-In by batch (POST /api/v1/categories/:id/stock-in)
router.post('/categories/:id/stock-in', protect, allowAction(ACTIONS.STOCK_MANAGE), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const qty = Math.max(Math.floor(Number(req.body?.qty) || 0), 0);
        const batchNumber = String(req.body?.batchNumber || '').trim();
        const expiryDate = parseDateOrNull(req.body?.expiryDate);
        if (!qty || !batchNumber || !expiryDate) {
            return sendError(res, 400, 'qty, batchNumber, and valid expiryDate are required', 'STOCK_IN_FIELDS_REQUIRED');
        }

        const category = await Category.findById(req.params.id);
        if (!category) return sendError(res, 404, 'Not Found', 'CATEGORY_NOT_FOUND');
        if (String(category.user) !== inventoryOwnerId) return sendError(res, 401, 'Not Allowed', 'CATEGORY_UNAUTHORIZED');

        const currentBatches = normalizeBatches(category.batches);
        const existingIndex = currentBatches.findIndex((batch) =>
            batch.batchNumber.toLowerCase() === batchNumber.toLowerCase()
            && new Date(batch.expiryDate).toISOString().slice(0, 10) === new Date(expiryDate).toISOString().slice(0, 10)
        );
        if (existingIndex >= 0) {
            currentBatches[existingIndex].qty = Number(currentBatches[existingIndex].qty || 0) + qty;
        } else {
            currentBatches.push({ batchNumber, expiryDate, qty });
        }

        const summary = summarizeStockFromBatches(currentBatches);
        category.batches = summary.batches;
        category.stockQty = summary.stockQty;
        category.expiryDate = summary.expiryDate;
        category.batchNumber = summary.batchNumber;
        await category.save();

        await writeAuditLog({
            req,
            userId: req.user.id,
            action: 'STOCK_IN',
            entityType: 'category',
            entityId: category._id,
            status: 'success',
            details: { medicineName: category.name, qty, batchNumber, expiryDate }
        });
        return res.json(category);
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'STOCK_IN_ERROR');
    }
});

// ROUTE 5B: Stock-Out by FEFO (POST /api/v1/categories/:id/stock-out)
router.post('/categories/:id/stock-out', protect, allowAction(ACTIONS.STOCK_MANAGE), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const qty = Math.max(Math.floor(Number(req.body?.qty) || 0), 0);
        if (!qty) {
            return sendError(res, 400, 'Valid qty is required', 'STOCK_OUT_QTY_INVALID');
        }

        const category = await Category.findById(req.params.id);
        if (!category) return sendError(res, 404, 'Not Found', 'CATEGORY_NOT_FOUND');
        if (String(category.user) !== inventoryOwnerId) return sendError(res, 401, 'Not Allowed', 'CATEGORY_UNAUTHORIZED');

        const result = consumeBatchesFefo(category.batches, qty);
        if (!result.ok) {
            return sendError(res, 400, 'Insufficient stock in available batches', 'STOCK_OUT_INSUFFICIENT');
        }

        const summary = summarizeStockFromBatches(result.batches);
        category.batches = summary.batches;
        category.stockQty = summary.stockQty;
        category.expiryDate = summary.expiryDate;
        category.batchNumber = summary.batchNumber;
        await category.save();

        await writeAuditLog({
            req,
            userId: req.user.id,
            action: 'STOCK_OUT',
            entityType: 'category',
            entityId: category._id,
            status: 'success',
            details: { medicineName: category.name, qty, allocations: result.allocations }
        });
        return res.json({
            category,
            allocations: result.allocations
        });
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'STOCK_OUT_ERROR');
    }
});

// ROUTE 5: Category summary with spending (e.g., GET /api/v1/categories/summary)
router.get('/categories/summary', protect, allowAction(ACTIONS.MEDICINE_VIEW), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const categories = await Category.find({ user: inventoryOwnerId }).sort({ name: 1 }).lean();
        const outflows = await Transaction.find({ user: inventoryOwnerId, type: { $ne: 'income' } })
            .select('category amount')
            .lean();

        const spentByCategory = outflows.reduce((acc, transaction) => {
            const key = String(transaction.category || '').trim();
            if (!key) return acc;
            const amount = Number(transaction.amount || 0);
            if (!Number.isFinite(amount) || amount < 0) return acc;
            acc[key] = (acc[key] || 0) + amount;
            return acc;
        }, {});

        const totalSpent = Object.values(spentByCategory).reduce((sum, amount) => sum + amount, 0);

        const items = categories.map((category) => {
            const spent = spentByCategory[category.name] || 0;
            const percent = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;
            return {
                ...category,
                spent,
                outflowPercent: Number(percent.toFixed(2))
            };
        });

        res.json({
            items,
            totals: {
                totalSpent,
                totalBudget: items.reduce((sum, item) => sum + Number(item.budget || 0), 0)
            }
        });
    } catch (error) {
        console.error(error.message);
        return res.json({
            items: [],
            totals: { totalSpent: 0, totalBudget: 0 },
            message: 'Summary temporarily unavailable'
        });
    }
});

// ROUTE 5C: Set expiry action workflow state (POST /api/v1/categories/:id/expiry-action)
router.post('/categories/:id/expiry-action', protect, allowAction(ACTIONS.STOCK_MANAGE), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const category = await Category.findById(req.params.id);
        if (!category) return sendError(res, 404, 'Not Found', 'CATEGORY_NOT_FOUND');
        if (String(category.user) !== inventoryOwnerId) return sendError(res, 401, 'Not Allowed', 'CATEGORY_UNAUTHORIZED');

        const status = String(req.body?.status || 'none').trim().toLowerCase();
        const note = String(req.body?.note || '').trim();
        const allowed = new Set(['none', 'return_to_supplier', 'clearance', 'quarantine', 'disposed']);
        if (!allowed.has(status)) {
            return sendError(res, 400, 'Invalid expiry action status', 'EXPIRY_ACTION_INVALID');
        }

        category.expiryActionStatus = status;
        category.expiryActionNote = note;
        category.expiryActionUpdatedAt = new Date();
        await category.save();

        await writeAuditLog({
            req,
            userId: req.user.id,
            action: 'EXPIRY_ACTION_UPDATE',
            entityType: 'category',
            entityId: category._id,
            status: 'success',
            details: {
                medicineName: category.name,
                expiryActionStatus: category.expiryActionStatus,
                expiryActionNote: category.expiryActionNote
            }
        });

        return res.json(category);
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'EXPIRY_ACTION_UPDATE_ERROR');
    }
});

// ROUTE 6: Cleanup duplicate categories for current user (e.g., POST /api/v1/categories/cleanup-duplicates)
router.post('/categories/cleanup-duplicates', protect, allowRoles('admin'), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const result = await cleanupCategoryDuplicatesForUser(inventoryOwnerId);
        return res.json({
            message: 'Category duplicate cleanup completed',
            ...result
        });
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'CATEGORY_CLEANUP_ERROR');
    }
});

module.exports = router;

