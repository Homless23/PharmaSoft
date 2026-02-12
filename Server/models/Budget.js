const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  monthlyLimit: {
    type: Number,
    default: 0
  },
  categoryLimits: {
    Food: { type: Number, default: 0 },
    Transportation: { type: Number, default: 0 },
    Healthcare: { type: Number, default: 0 },
    Entertainment: { type: Number, default: 0 },
    Housing: { type: Number, default: 0 },
    Utilities: { type: Number, default: 0 },
    Stationary: { type: Number, default: 0 },
    Other: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Budget', BudgetSchema);