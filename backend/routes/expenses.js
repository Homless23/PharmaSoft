const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const Expense = require('../models/Expense');
const { body, validationResult } = require('express-validator');

// ROUTE 1: Get All Expenses
router.get('/', fetchuser, async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.user.id }).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 2: Add Expense
router.post('/add', fetchuser, [
    // FIX: Min length is now 1, so "TV" or "hh" works!
    body('title', 'Title cannot be empty').isLength({ min: 1 }), 
    body('amount', 'Amount must be a number').isNumeric(),
], async (req, res) => {
    try {
        const { title, amount, category, date } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const expense = new Expense({
            title, amount, category, date, user: req.user.id 
        });
        const savedExpense = await expense.save();
        res.json(savedExpense);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 3: Delete Expense
router.delete('/:id', fetchuser, async (req, res) => {
    try {
        let expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).send("Not Found");
        if (expense.user.toString() !== req.user.id) return res.status(401).send("Not Allowed");

        expense = await Expense.findByIdAndDelete(req.params.id);
        res.json({ "Success": "Expense has been deleted", expense: expense });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 4: Update Expense
router.put('/:id', fetchuser, async (req, res) => {
    const { title, amount, category, date } = req.body;
    const newExpense = {};
    if (title) newExpense.title = title;
    if (amount) newExpense.amount = amount;
    if (category) newExpense.category = category;
    if (date) newExpense.date = date;

    try {
        let expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).send("Not Found");
        if (expense.user.toString() !== req.user.id) return res.status(401).send("Not Allowed");

        expense = await Expense.findByIdAndUpdate(req.params.id, { $set: newExpense }, { new: true });
        res.json(expense);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;