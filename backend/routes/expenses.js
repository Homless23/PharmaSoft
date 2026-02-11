const express = require('express');
const router = express.Router();
const { 
    getExpenses, 
    addExpense, 
    deleteExpense,
    updateExpense // Assuming you have this, if not remove it
} = require('../controllers/expenseController');

// --- THE FIX: Import 'protect' from the new auth.js middleware ---
const { protect } = require('../middleware/auth'); 

// Apply protection to all routes - prefixed with /expenses
router.route('/expenses')
    .get(protect, getExpenses)
    .post(protect, addExpense);

router.route('/expenses/:id')
    .delete(protect, deleteExpense)
    // .put(protect, updateExpense); // Uncomment if you have update logic

module.exports = router;