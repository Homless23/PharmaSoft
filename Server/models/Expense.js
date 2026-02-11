const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    type: { type: String, default: "expense" },
    date: { type: Date, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);