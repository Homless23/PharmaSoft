const mongoose = require('mongoose');
const { Schema } = mongoose;

const BatchSchema = new Schema({
    batchNumber: {
        type: String,
        required: true,
        trim: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    qty: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const CategorySchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    genericName: {
        type: String,
        default: '',
        trim: true
    },
    strength: {
        type: String,
        default: '',
        trim: true
    },
    sku: {
        type: String,
        default: '',
        trim: true
    },
    barcode: {
        type: String,
        default: '',
        trim: true
    },
    rackLocation: {
        type: String,
        default: '',
        trim: true
    },
    batchNumber: {
        type: String,
        default: '',
        trim: true
    },
    manufacturer: {
        type: String,
        default: '',
        trim: true
    },
    unitPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    stockQty: {
        type: Number,
        default: 0,
        min: 0
    },
    reorderPoint: {
        type: Number,
        default: 10,
        min: 0
    },
    prescriptionRequired: {
        type: Boolean,
        default: false
    },
    regulatoryClass: {
        type: String,
        enum: ['none', 'schedule_h', 'narcotic', 'psychotropic', 'other'],
        default: 'none'
    },
    batches: {
        type: [BatchSchema],
        default: []
    },
    expiryDate: {
        type: Date,
        default: null
    },
    budget: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    },
    expiryActionStatus: {
        type: String,
        enum: ['none', 'return_to_supplier', 'clearance', 'quarantine', 'disposed'],
        default: 'none'
    },
    expiryActionNote: {
        type: String,
        default: '',
        trim: true
    },
    expiryActionUpdatedAt: {
        type: Date,
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    }
});

CategorySchema.index({ user: 1, name: 1 });
CategorySchema.index({ user: 1, barcode: 1 });
CategorySchema.index({ user: 1, rackLocation: 1 });

module.exports = mongoose.model('category', CategorySchema);
