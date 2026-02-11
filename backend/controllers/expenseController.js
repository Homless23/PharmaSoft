const Expense = require('../models/Expense'); // <--- Matches the file created in Step 1

// @desc    Get all expenses for the logged in user
// @route   GET /api/v1/transactions
// @access  Private
exports.getExpenses = async (req, res, next) => {
  try {
    // Only find expenses that belong to the logged-in user (req.user.id)
    const expenses = await Expense.find({ user: req.user.id });

    return res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Add expense
// @route   POST /api/v1/transactions
// @access  Private
exports.addExpense = async (req, res, next) => {
  try {
    const { title, amount, category } = req.body;

    // Create expense attached to the specific user
    const expense = await Expense.create({
      title,
      amount,
      category,
      user: req.user.id
    });

    return res.status(201).json({
      success: true,
      data: expense
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }
};

// @desc    Delete expense
// @route   DELETE /api/v1/transactions/:id
// @access  Private
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'No expense found'
      });
    }

    // Make sure user owns the expense before deleting
    if (expense.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this expense'
      });
    }

    await expense.deleteOne();

    return res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};