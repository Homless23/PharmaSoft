const express = require('express');
const { register, login, getMe, updateDetails } = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All these routes are prefixed with /auth (e.g., /api/v1/auth/register)
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', protect, getMe);
router.put('/auth/updatedetails', protect, updateDetails);

module.exports = router;