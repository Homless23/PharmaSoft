const Transaction = require('../models/Transaction');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all transactions
exports.getTransactions = asyncHandler(async (req, res, next) => {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ date: -1 });
    res.status(200).json({ success: true, count: transactions.length, data: transactions });
});

// @desc    Add transaction
exports.addTransaction = asyncHandler(async (req, res, next) => {
    const { text, amount, type, category } = req.body;
    const transaction = await Transaction.create({
        text,
        amount,
        type,
        category,
        user: req.user.id
    });
    res.status(201).json({ success: true, data: transaction });
});

// @desc    Delete transaction - ENSURE THIS NAME MATCHES THE ROUTE
exports.deleteTransaction = asyncHandler(async (req, res, next) => {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
        return res.status(404).json({ success: false, message: 'No transaction found' });
    }

    if (transaction.user.toString() !== req.user.id) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await transaction.deleteOne();
    res.status(200).json({ success: true, data: {} });
});