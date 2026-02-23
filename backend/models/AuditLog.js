const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    action: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    entityType: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    entityId: {
        type: String,
        default: '',
        trim: true
    },
    status: {
        type: String,
        enum: ['success', 'failure'],
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ip: {
        type: String,
        default: '',
        trim: true
    },
    userAgent: {
        type: String,
        default: '',
        trim: true
    }
}, { timestamps: true });

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

// Audit logs are append-only for compliance.
const immutableError = () => new Error('AuditLog is immutable and cannot be modified or deleted');
AuditLogSchema.pre('save', function enforceCreateOnly() {
    if (this.isNew) return;
    throw immutableError();
});
AuditLogSchema.pre('deleteOne', { document: true, query: false }, function preventDelete() {
    throw immutableError();
});
AuditLogSchema.pre('deleteMany', function preventDeleteMany() {
    throw immutableError();
});
AuditLogSchema.pre('findOneAndDelete', function preventFindOneAndDelete() {
    throw immutableError();
});
AuditLogSchema.pre('findOneAndUpdate', function preventFindOneAndUpdate() {
    throw immutableError();
});
AuditLogSchema.pre('updateOne', function preventUpdateOne() {
    throw immutableError();
});
AuditLogSchema.pre('updateMany', function preventUpdateMany() {
    throw immutableError();
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
