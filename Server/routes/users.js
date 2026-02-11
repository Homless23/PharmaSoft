const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { register, login, getMe, updateDetails, updatePassword, getLogs, deleteAccount } = require('../controllers/users');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Valid email required').isEmail(),
  check('password', '6+ characters required').isLength({ min: 6 })
], validate, register);

router.post('/login', [
  check('email', 'Valid email required').isEmail(),
  check('password', 'Password is required').exists()
], validate, login);

router.get('/me', auth, getMe);
router.put('/updatedetails', auth, updateDetails);
router.put('/updatepassword', [
  check('currentPassword', 'Current password is required').not().isEmpty(),
  check('newPassword', 'New password must be 6+ chars').isLength({ min: 6 })
], auth, validate, updatePassword);
router.get('/logs', auth, getLogs);
router.delete('/deleteaccount', auth, deleteAccount);

module.exports = router;
