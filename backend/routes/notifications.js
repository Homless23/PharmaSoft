const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getMyNotifications,
    createMyNotification,
    markAllNotificationsRead
} = require('../controllers/notificationController');

router.get('/notifications', protect, getMyNotifications);
router.post('/notifications', protect, createMyNotification);
router.post('/notifications/read-all', protect, markAllNotificationsRead);

module.exports = router;

