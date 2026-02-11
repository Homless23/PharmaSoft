const express = require('express');
const router = express.Router();
const { addExpense, getExpenses, deleteExpense } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.post('/add-expense', protect, addExpense);
router.get('/get-expenses', protect, getExpenses);
router.delete('/delete-expense/:id', protect, deleteExpense);

module.exports = router;