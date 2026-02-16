const express = require('express');
const router = express.Router();
const {
    addExpense,
    getExpenses,
    updateExpense,
    getRecurringAlerts,
    processRecurringDue,
    generateRecurringExpense,
    deleteExpense
} = require('../controllers/expenseController');
const { getInsights } = require('../controllers/insightController');
const { protect } = require('../middleware/authMiddleware');

// All these routes are protected
router.post('/add-expense', protect, addExpense);
router.get('/get-expenses', protect, getExpenses);
router.get('/recurring-alerts', protect, getRecurringAlerts);
router.post('/process-recurring-due', protect, processRecurringDue);
router.get('/insights', protect, getInsights);
router.put('/update-expense/:id', protect, updateExpense);
router.post('/generate-recurring/:id', protect, generateRecurringExpense);
router.delete('/delete-expense/:id', protect, deleteExpense);

module.exports = router;
