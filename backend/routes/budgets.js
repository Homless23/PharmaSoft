const express = require('express');
const router = express.Router();
const { protect, allowAction } = require('../middleware/authMiddleware');
const { autoAllocateBudgets } = require('../controllers/budgetController');
const { ACTIONS } = require('../config/rbacPolicy');

router.post('/budgets/auto-allocate', protect, allowAction(ACTIONS.BUDGETS_MANAGE), autoAllocateBudgets);

module.exports = router;
