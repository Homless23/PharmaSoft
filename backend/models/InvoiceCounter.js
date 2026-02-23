const mongoose = require('mongoose');

const InvoiceCounterSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true
    },
    fiscalYear: {
        type: String,
        required: true,
        trim: true
    },
    seq: {
        type: Number,
        default: 0,
        min: 0
    }
}, { timestamps: true });

InvoiceCounterSchema.index({ user: 1, fiscalYear: 1 }, { unique: true });

module.exports = mongoose.model('InvoiceCounter', InvoiceCounterSchema);
