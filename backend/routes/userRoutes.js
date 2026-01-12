const express = require('express');
const router = express.Router();
// Import both functions now
const { registerUser, loginUser } = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', loginUser); // <--- New Line

module.exports = router;