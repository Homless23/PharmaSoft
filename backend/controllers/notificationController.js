const Notification = require('../models/Notification');
const { sendError } = require('../utils/apiResponse');

exports.getMyNotifications = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query?.limit) || 60, 1), 200);
        const rows = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return res.json(rows);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'NOTIFICATIONS_FETCH_ERROR');
    }
};

exports.createMyNotification = async (req, res) => {
    try {
        const message = String(req.body?.message || '').trim();
        const type = String(req.body?.type || 'info').trim().toLowerCase();
        if (!message) {
            return sendError(res, 400, 'message is required', 'NOTIFICATION_MESSAGE_REQUIRED');
        }
        const safeType = ['info', 'success', 'warning', 'error'].includes(type) ? type : 'info';
        const created = await Notification.create({
            user: req.user.id,
            message,
            type: safeType,
            read: false
        });
        return res.status(201).json(created);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'NOTIFICATION_CREATE_ERROR');
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { $set: { read: true, readAt: new Date() } }
        );
        return res.json({ ok: true });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'NOTIFICATIONS_MARK_READ_ERROR');
    }
};
