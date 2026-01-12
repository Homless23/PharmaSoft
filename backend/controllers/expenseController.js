const Expense = require('../models/Expense');

// @desc    Get all expenses for the logged-in user
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
    // Find expenses where the 'user' field matches the current user's ID
    const expenses = await Expense.find({ user: req.user.id });
    res.json(expenses);
};

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
    const { title, amount, category, date } = req.body;

    if (!title || !amount || !category) {
        return res.status(400).json({ message: 'Please fill all fields' });
    }

    const expense = await Expense.create({
        user: req.user.id, // We get this ID from the middleware
        title,
        amount,
        category,
        date,
    });

    res.status(201).json(expense);
};

module.exports = { getExpenses, createExpense };