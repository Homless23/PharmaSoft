const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const Expense = require('../models/Expense');
const Category = require('../models/Category'); 
const User = require('../models/User'); 
const sendEmail = require('../utils/emailService');
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

// ROUTE 2: Add a new Expense (With Budget Check & Email Alert)
router.post('/add', fetchuser, [
    body('title', 'Title cannot be empty').exists(),
    body('amount', 'Amount cannot be empty').exists(),
    body('category', 'Category cannot be empty').exists(),
], async (req, res) => {
    try {
        const { title, amount, category, date } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 1. Save the Expense
        const expense = new Expense({
            title, amount, category, date, user: req.user.id
        });
        const savedExpense = await expense.save();

        // --- DEBUG & EMAIL LOGIC ---
        console.log(`Checking budget for: ${category}`);

        // 2. Find the Category
        const catObj = await Category.findOne({ user: req.user.id, name: category });
        
        if (!catObj) {
            console.log("Category not found or no budget set.");
        } else if (catObj.budget <= 0) {
            console.log("Budget is 0, skipping alert.");
        } else {
            // 3. Calculate Total Spent in this Category
            const expenses = await Expense.find({ user: req.user.id, category: category });
            const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

            console.log(`Budget: ${catObj.budget} | Total Spent: ${totalSpent}`);

            // 4. Check if Over Budget
            if (totalSpent > catObj.budget) {
                console.log("🚨 OVER BUDGET! Sending email...");
                
                const userObj = await User.findById(req.user.id);
                if(userObj) {
                    const subject = `⚠️ Budget Alert: ${category}`;
                    const message = `Hi ${userObj.name},\n\nYou have exceeded your budget for ${category}.\n\nBudget: Rs ${catObj.budget}\nTotal Spent: Rs ${totalSpent}\n\nStop spending money! 💸\n\n- ExpenseTracker`;
                    
                    await sendEmail(userObj.email, subject, message);
                } else {
                    console.log("User email not found.");
                }
            } else {
                console.log("✅ Under budget.");
            }
        }
        // ---------------------------

        res.json(savedExpense);

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 3: Update an Expense
router.put('/:id', fetchuser, async (req, res) => {
    const { title, amount, category, date } = req.body;
    try {
        const newExpense = {};
        if (title) newExpense.title = title;
        if (amount) newExpense.amount = amount;
        if (category) newExpense.category = category;
        if (date) newExpense.date = date;

        let expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).send("Not Found");

        if (expense.user.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed");
        }

        expense = await Expense.findByIdAndUpdate(req.params.id, { $set: newExpense }, { new: true });
        res.json(expense);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 4: Delete an Expense
router.delete('/:id', fetchuser, async (req, res) => {
    try {
        let expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).send("Not Found");

        if (expense.user.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed");
        }

        await Expense.findByIdAndDelete(req.params.id);
        res.json({ "Success": "Expense has been deleted", expense: expense });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;