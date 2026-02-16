const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const { cleanupCategoryDuplicatesForUser } = require('../utils/categoryCleanup');
const { body, validationResult } = require('express-validator');
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ROUTE 1: Get All Categories (e.g., GET /api/v1/categories)
router.get('/categories', protect, async (req, res) => {
    try {
        const categories = await Category.find({ user: req.user.id }).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 2: Add Category (e.g., POST /api/v1/categories/add)
router.post('/categories/add', protect, [
    body('name', 'Name is required').isLength({ min: 1 }).trim(),
], async (req, res) => {
    try {
        const { name, budget, active } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const normalizedName = String(name || '').trim();
        const budgetNumber = Number(budget) || 0;

        // Check if category already exists for this user
        const existing = await Category.findOne({
            user: req.user.id,
            name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' }
        });
        if(existing) {
            return res.status(400).json({ error: "Category already exists" });
        }

        const category = new Category({
            name: normalizedName,
            budget: budgetNumber,
            active: active !== false,
            user: req.user.id
        });
        const savedCategory = await category.save();

        // FIX: Send ONLY the saved category object, no wrappers!
        res.json(savedCategory);

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 3: Update Category Budget (e.g., PUT /api/v1/categories/:id)
router.put('/categories/:id', protect, async (req, res) => {
    const { budget, name, active } = req.body;
    try {
        let category = await Category.findById(req.params.id);
        if(!category) return res.status(404).send("Not Found");
        if(category.user.toString() !== req.user.id) return res.status(401).send("Not Allowed");

        const updates = {};
        if (typeof budget !== 'undefined') {
            updates.budget = Number(budget) || 0;
        }
        if (typeof name === 'string') {
            const normalizedName = name.trim();
            if (!normalizedName) {
                return res.status(400).json({ message: 'Category name is required' });
            }
            const duplicate = await Category.findOne({
                _id: { $ne: req.params.id },
                user: req.user.id,
                name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' }
            });
            if (duplicate) {
                return res.status(400).json({ message: 'Category already exists' });
            }
            updates.name = normalizedName;
        }
        if (typeof active !== 'undefined') {
            updates.active = Boolean(active);
        }

        updates.date = new Date();
        category = await Category.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
        res.json(category);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 4: Delete Category (e.g., DELETE /api/v1/categories/:id)
router.delete('/categories/:id', protect, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send("Not Found");
        if (category.user.toString() !== req.user.id) return res.status(401).send("Not Allowed");

        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 5: Category summary with spending (e.g., GET /api/v1/categories/summary)
router.get('/categories/summary', protect, async (req, res) => {
    try {
        const categories = await Category.find({ user: req.user.id }).sort({ name: 1 }).lean();
        const expenses = await Expense.find({ user: req.user.id, type: { $ne: 'income' } })
            .select('category amount')
            .lean();

        const spentByCategory = expenses.reduce((acc, expense) => {
            const key = String(expense.category || '').trim();
            if (!key) return acc;
            const amount = Number(expense.amount || 0);
            if (!Number.isFinite(amount) || amount < 0) return acc;
            acc[key] = (acc[key] || 0) + amount;
            return acc;
        }, {});

        const totalSpent = Object.values(spentByCategory).reduce((sum, amount) => sum + amount, 0);

        const items = categories.map((category) => {
            const spent = spentByCategory[category.name] || 0;
            const percent = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;
            return {
                ...category,
                spent,
                expensePercent: Number(percent.toFixed(2))
            };
        });

        res.json({
            items,
            totals: {
                totalSpent,
                totalBudget: items.reduce((sum, item) => sum + Number(item.budget || 0), 0)
            }
        });
    } catch (error) {
        console.error(error.message);
        return res.json({
            items: [],
            totals: { totalSpent: 0, totalBudget: 0 },
            message: 'Summary temporarily unavailable'
        });
    }
});

// ROUTE 6: Cleanup duplicate categories for current user (e.g., POST /api/v1/categories/cleanup-duplicates)
router.post('/categories/cleanup-duplicates', protect, async (req, res) => {
    try {
        const result = await cleanupCategoryDuplicatesForUser(req.user.id);
        return res.json({
            message: 'Category duplicate cleanup completed',
            ...result
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
