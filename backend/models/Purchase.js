const mongoose = require('mongoose');

const PurchaseItemSchema = new mongoose.Schema({
    medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        required: true
    },
    medicineName: {
        type: String,
        required: true,
        trim: true
    },
    batchNumber: {
        type: String,
        default: '',
        trim: true
    },
    expiryDate: {
        type: Date,
        default: null
    },
    qty: {
        type: Number,
        required: true,
        min: 1
    },
    costRate: {
        type: Number,
        required: true,
        min: 0
    },
    lineTotal: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const PurchaseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    purchaseNumber: {
        type: String,
        required: true,
        trim: true
    },
    supplierName: {
        type: String,
        required: true,
        trim: true
    },
    supplierInvoiceNumber: {
        type: String,
        default: '',
        trim: true
    },
    purchaseDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'received', 'cancelled'],
        default: 'draft'
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid'
    },
    amountPaid: {
        type: Number,
        default: 0,
        min: 0
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    notes: {
        type: String,
        default: '',
        trim: true
    },
    items: {
        type: [PurchaseItemSchema],
        default: []
    },
    receivedAt: {
        type: Date,
        default: null
    },
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    }
}, { timestamps: true });

PurchaseSchema.index({ user: 1, purchaseNumber: 1 }, { unique: true });
PurchaseSchema.index({ user: 1, supplierName: 1, createdAt: -1 });

module.exports = mongoose.model('purchase', PurchaseSchema);
