const mongoose = require('mongoose');

const AppSettingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        unique: true,
        index: true
    },
    businessName: {
        type: String,
        default: 'Pharmacy',
        trim: true
    },
    businessPan: {
        type: String,
        default: '',
        trim: true
    },
    businessAddress: {
        type: String,
        default: '',
        trim: true
    },
    defaultVatRate: {
        type: Number,
        default: 13,
        min: 0,
        max: 100
    },
    receiptFooter: {
        type: String,
        default: '',
        trim: true
    },
    printerType: {
        type: String,
        enum: ['thermal_80mm', 'a4', 'other'],
        default: 'thermal_80mm'
    }
}, { timestamps: true });

module.exports = mongoose.model('app_setting', AppSettingSchema);
