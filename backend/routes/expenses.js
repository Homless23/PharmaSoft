const express = require('express');
const router = express.Router();
const {
    addExpense,
    getExpenses,
    updateExpense,
    generateRecurringExpense,
    deleteExpense
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

// All these routes are protected
router.post('/add-expense', protect, addExpense);
router.get('/get-expenses', protect, getExpenses);
router.put('/update-expense/:id', protect, updateExpense);
router.post('/generate-recurring/:id', protect, generateRecurringExpense);
router.delete('/delete-expense/:id', protect, deleteExpense);

module.exports = router;
