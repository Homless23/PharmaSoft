const mongoose = require('mongoose');


const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Transaction must belong to a user']
    },
    text: {
        type: String,
        trim: true,
        required: [true, 'Please add a description']
    },
    amount: {
        type: Number,
        required: [true, 'Please add an amount']
    },
    type: {
        type: String,
        required: [true, 'Type (income/expense) is required'],
        enum: ['income', 'expense']
    },
    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: ['Housing', 'Food', 'Transportation', 'Utilities', 'Insurance', 'Healthcare', 'Saving', 'Personal', 'Entertainment']
    }
}, { timestamps: true });

TransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);