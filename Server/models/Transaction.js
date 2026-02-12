const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  text: {
    type: String,
    trim: true,
    required: [true, 'Please add a description']
  },
  amount: {
    type: Number,
    required: [true, 'Please add a positive or negative number']
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: [
      'Food', 'Transportation', 'Healthcare', 
      'Entertainment', 'Housing', 'Utilities', 
      'Stationary', 'Other'
    ]
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Transaction must belong to a user'], // Prevents orphan transactions
    index: true // Individual index for basic filtering
  }
}, {
  timestamps: true
});

// COMPOUND INDEX: Optimizes fetching recent transactions for a specific user
TransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);