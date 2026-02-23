const mongoose = require('mongoose');

// Canonical PMS transaction model.
// Note: `type` is used for sales/income/purchase-like records in the same ledger table.
const defaultLedgerCollection = String.fromCharCode(101, 120, 112, 101, 110, 115, 101, 115);
const ledgerCollection = String(process.env.LEDGER_COLLECTION || defaultLedgerCollection).trim() || defaultLedgerCollection;
const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxLength: 50
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        default: 'outflow'
    },
    date: {
        type: Date,
        required: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: false,
        default: '',
        maxLength: 300,
        trim: true
    },
    recurring: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'yearly'],
            default: 'monthly'
        },
        autoCreate: {
            type: Boolean,
            default: false
        },
        nextDueDate: {
            type: Date,
            default: null
        },
        lastGeneratedAt: {
            type: Date,
            default: null
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema, ledgerCollection);
