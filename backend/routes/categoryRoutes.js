const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Category = require('../models/Category');
const { body, validationResult } = require('express-validator');

// ROUTE 1: Get All Categories (e.g., GET /api/v1/categories)
router.get('/categories', protect, async (req, res) => {
    try {
        const categories = await Category.find({ user: req.user.id });
        res.json(categories);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 2: Add Category (e.g., POST /api/v1/categories/add)
router.post('/categories/add', protect, [
    body('name', 'Name is required').isLength({ min: 1 }),
], async (req, res) => {
    try {
        const { name, budget } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check if category already exists for this user
        const existing = await Category.findOne({ name, user: req.user.id });
        if(existing) {
            return res.status(400).json({ error: "Category already exists" });
        }

        const category = new Category({ name, budget, user: req.user.id });
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
    const { budget } = req.body;
    try {
        let category = await Category.findById(req.params.id);
        if(!category) return res.status(404).send("Not Found");
        if(category.user.toString() !== req.user.id) return res.status(401).send("Not Allowed");

        category = await Category.findByIdAndUpdate(req.params.id, { $set: { budget } }, { new: true });
        res.json(category);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
