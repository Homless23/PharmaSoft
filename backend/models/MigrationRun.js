const mongoose = require('mongoose');

const MigrationRunSchema = new mongoose.Schema({
    scriptName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    mode: {
        type: String,
        enum: ['dry-run', 'apply'],
        default: 'dry-run',
        index: true
    },
    applied: {
        type: Boolean,
        default: false
    },
    summary: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    finishedAt: {
        type: Date,
        default: Date.now
    },
    executedBy: {
        type: String,
        default: ''
    },
    host: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('MigrationRun', MigrationRunSchema);

