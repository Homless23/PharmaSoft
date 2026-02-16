const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 80
    },
    targetAmount: {
        type: Number,
        required: true,
        min: 1
    },
    currentAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    deadline: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'paused'],
        default: 'active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Goal', GoalSchema);
