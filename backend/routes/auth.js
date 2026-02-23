const express = require('express');
const router = express.Router();
const { registerUser, loginUser, adminLogin, logoutUser, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { createIpRateLimiter } = require('../middleware/rateLimit');
const { allowOnlyBodyFields } = require('../middleware/requestSchema');

const registerLimiter = createIpRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many registration attempts. Please try again later.',
    code: 'REGISTER_RATE_LIMITED'
});

const loginLimiter = createIpRateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many login attempts. Please wait a minute and try again.',
    code: 'AUTH_RATE_LIMITED'
});

const adminLoginLimiter = createIpRateLimiter({
    windowMs: 60 * 1000,
    max: 3,
    message: 'Too many admin login attempts. Please wait a minute and try again.',
    code: 'ADMIN_AUTH_RATE_LIMITED'
});

const passwordLimiter = createIpRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: 'Too many password change requests. Please try again later.',
    code: 'PASSWORD_RATE_LIMITED'
});

router.post('/register', registerLimiter, allowOnlyBodyFields(['name', 'email', 'password', 'confirmPassword']), registerUser);
router.post('/login', loginLimiter, allowOnlyBodyFields(['email', 'password']), loginUser);
router.post('/admin/login', adminLoginLimiter, allowOnlyBodyFields(['email', 'password']), adminLogin);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, allowOnlyBodyFields(['name', 'avatarDataUrl', 'removeAvatar']), updateProfile);
router.put('/password', protect, passwordLimiter, allowOnlyBodyFields(['currentPassword', 'newPassword']), changePassword);

module.exports = router;
