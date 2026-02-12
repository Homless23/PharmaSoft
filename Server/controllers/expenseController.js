const Expense = require('../models/Expense');

exports.addExpense = async (req, res) => {
    try {
        const { title, amount, category, description, date } = req.body;

        // Validate all required fields
        if (!title || !category || !description || !date) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        // Validate amount type and value (FIXED: corrected logic)
        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
        }

        // Validate title length
        if (title.trim().length > 100) {
            return res.status(400).json({ success: false, error: 'Title must be under 100 characters' });
        }

        // Validate date is valid
        if (isNaN(Date.parse(date))) {
            return res.status(400).json({ success: false, error: 'Invalid date format' });
        }

        const expense = new Expense({
            title: title.trim(),
            amount,
            category,
            description: description.trim(),
            date,
            user: req.user.id
        });

        await expense.save();
        res.status(201).json({ success: true, data: expense });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to add expense' });
    }
}

exports.getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: expenses });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
    }
}

exports.deleteExpense = async (req, res) => {
    const { id } = req.params;
    try {
        const expense = await Expense.findById(id);
        if (!expense) {
            return res.status(404).json({ success: false, error: 'Expense not found' });
        }
        
        // Ensure user owns the expense
        if (expense.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized to delete this expense' });
        }

        await Expense.findByIdAndDelete(id);
        res.status(200).json({ success: true, data: { id } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete expense' });
    }
}