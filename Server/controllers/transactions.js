const Transaction = require('../models/Transaction');

// @desc    Get summary (income, expense, balance) - lightweight
// @route   GET /api/transactions/summary
exports.getSummary = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user });
    
    const totalIncome = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalBalance = totalIncome + totalExpense;
    const transactionCount = transactions.length;

    return res.status(200).json({
      success: true,
      data: {
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        totalExpense: parseFloat(totalExpense.toFixed(2)),
        totalBalance: parseFloat(totalBalance.toFixed(2)),
        transactionCount
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get analytics (breakdown by category) - lightweight
// @route   GET /api/transactions/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user });
    
    const categoryTotals = {};
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.amount < 0) {
        const cat = t.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
        totalExpense += Math.abs(t.amount);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        categories: categoryTotals,
        totalExpense: parseFloat(totalExpense.toFixed(2))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get all transactions for the logged-in user
// @route   GET /api/transactions
exports.getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Transaction.countDocuments({ user: req.user });
    const transactions = await Transaction.find({ user: req.user })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const pages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      pages,
      currentPage: page,
      data: transactions
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Add transaction
// @route   POST /api/transactions
exports.addTransaction = async (req, res) => {
  try {
    const { text, amount, category } = req.body;
    const transaction = await Transaction.create({ text, amount, category, user: req.user });
    return res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, error: 'No transaction found' });
    if (transaction.user.toString() !== req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await transaction.deleteOne();
    return res.status(200).json({ success: true, data: {} });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};