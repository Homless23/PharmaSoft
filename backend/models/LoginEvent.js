const mongoose = require('mongoose');

const LoginEventSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    success: {
        type: Boolean,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'pharmacist', 'cashier', 'unknown'],
        default: 'unknown'
    },
    ip: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('LoginEvent', LoginEventSchema);
