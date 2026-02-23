const mongoose = require('mongoose');

const ExpiredOverrideTokenSchema = new mongoose.Schema({
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    issuedByEmail: {
        type: String,
        default: '',
        trim: true
    },
    reason: {
        type: String,
        default: '',
        trim: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    usedAt: {
        type: Date,
        default: null,
        index: true
    },
    usedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    usedForBill: {
        type: String,
        default: '',
        trim: true
    }
}, { timestamps: true });

ExpiredOverrideTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ExpiredOverrideToken', ExpiredOverrideTokenSchema);
