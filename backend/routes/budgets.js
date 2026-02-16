const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { autoAllocateBudgets } = require('../controllers/budgetController');

router.post('/budgets/auto-allocate', protect, autoAllocateBudgets);

module.exports = router;
