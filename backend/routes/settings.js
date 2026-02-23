const express = require('express');
const { protect, allowAction } = require('../middleware/authMiddleware');
const { ACTIONS } = require('../config/rbacPolicy');
const AppSetting = require('../models/AppSetting');
const { sendError } = require('../utils/apiResponse');

const router = express.Router();

const getInventoryOwnerId = (req) => String(req.user?.ownerAdmin || req.user?.id || req.user?._id || '');

router.get('/settings', protect, allowAction(ACTIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        let settings = await AppSetting.findOne({ user: inventoryOwnerId }).lean();
        if (!settings) {
            settings = await AppSetting.create({ user: inventoryOwnerId });
            settings = settings.toObject();
        }
        return res.json(settings);
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'SETTINGS_FETCH_ERROR');
    }
});

router.put('/settings', protect, allowAction(ACTIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const updates = {};
        if (typeof req.body?.businessName !== 'undefined') updates.businessName = String(req.body.businessName || '').trim() || 'Pharmacy';
        if (typeof req.body?.businessPan !== 'undefined') updates.businessPan = String(req.body.businessPan || '').trim();
        if (typeof req.body?.businessAddress !== 'undefined') updates.businessAddress = String(req.body.businessAddress || '').trim();
        if (typeof req.body?.receiptFooter !== 'undefined') updates.receiptFooter = String(req.body.receiptFooter || '').trim();
        if (typeof req.body?.defaultVatRate !== 'undefined') {
            updates.defaultVatRate = Math.max(Math.min(Number(req.body.defaultVatRate) || 0, 100), 0);
        }
        if (typeof req.body?.printerType !== 'undefined') {
            const safePrinter = String(req.body.printerType || '').trim().toLowerCase();
            updates.printerType = ['thermal_80mm', 'a4', 'other'].includes(safePrinter) ? safePrinter : 'thermal_80mm';
        }
        const settings = await AppSetting.findOneAndUpdate(
            { user: inventoryOwnerId },
            { $set: updates, $setOnInsert: { user: inventoryOwnerId } },
            { new: true, upsert: true }
        );
        return res.json(settings);
    } catch (error) {
        console.error(error.message);
        return sendError(res, 500, 'Internal Server Error', 'SETTINGS_UPDATE_ERROR');
    }
});

module.exports = router;
