const mongoose = require('mongoose');

const BillItemSchema = new mongoose.Schema({
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
    qty: {
        type: Number,
        required: true,
        min: 1
    },
    rate: {
        type: Number,
        required: true,
        min: 0
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    costRate: {
        type: Number,
        default: 0,
        min: 0
    },
    costAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    profitAmount: {
        type: Number,
        default: 0
    },
    batchAllocations: {
        type: [{
            batchNumber: { type: String, required: true, trim: true },
            expiryDate: { type: Date, required: true },
            qty: { type: Number, required: true, min: 0 }
        }],
        default: []
    }
}, { _id: false });

const BillSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true
    },
    billNumber: {
        type: String,
        required: true,
        trim: true
    },
    clientRequestId: {
        type: String,
        default: '',
        trim: true
    },
    billDate: {
        type: Date,
        required: true
    },
    customerName: {
        type: String,
        default: '',
        trim: true
    },
    customerKey: {
        type: String,
        required: true,
        trim: true
    },
    customerPhone: {
        type: String,
        default: '',
        trim: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'esewa', 'khalti', 'other'],
        default: 'cash'
    },
    paymentReference: {
        type: String,
        default: '',
        trim: true
    },
    customerPan: {
        type: String,
        default: '',
        trim: true
    },
    prescriptionRecord: {
        mode: {
            type: String,
            enum: ['none', 'image', 'digital'],
            default: 'none'
        },
        imageDataUrl: {
            type: String,
            default: ''
        },
        digitalText: {
            type: String,
            default: '',
            trim: true
        },
        doctorName: {
            type: String,
            default: '',
            trim: true
        },
        doctorLicense: {
            type: String,
            default: '',
            trim: true
        },
        attachedAt: {
            type: Date,
            default: null
        }
    },
    items: {
        type: [BillItemSchema],
        validate: {
            validator: (items) => Array.isArray(items) && items.length > 0,
            message: 'At least one bill item is required'
        }
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    discountPercent: {
        type: Number,
        default: 0,
        min: 0
    },
    discountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    vatApplicable: {
        type: Boolean,
        default: true
    },
    taxPercent: {
        type: Number,
        default: 13,
        min: 0
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    grandTotal: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['finalized', 'voided'],
        default: 'finalized',
        index: true
    },
    voidedAt: {
        type: Date,
        default: null
    },
    voidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    voidReason: {
        type: String,
        default: '',
        trim: true
    },
    fiscalYear: {
        type: String,
        default: '',
        trim: true
    },
    invoiceSequence: {
        type: Number,
        default: 0,
        min: 0
    },
    sellerName: {
        type: String,
        default: '',
        trim: true
    },
    sellerPan: {
        type: String,
        default: '',
        trim: true
    },
    sellerAddress: {
        type: String,
        default: '',
        trim: true
    },
    prescriptionStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    prescriptionNote: {
        type: String,
        default: '',
        trim: true
    },
    prescriptionVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    prescriptionVerifiedAt: {
        type: Date,
        default: null
    },
    expiredOverride: {
        approved: {
            type: Boolean,
            default: false
        },
        approvedAt: {
            type: Date,
            default: null
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        approvedByEmail: {
            type: String,
            default: '',
            trim: true
        },
        reason: {
            type: String,
            default: '',
            trim: true
        },
        tokenId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExpiredOverrideToken',
            default: null
        },
        lines: {
            type: [{
                medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'category' },
                medicineName: { type: String, default: '', trim: true },
                allocations: {
                    type: [{
                        batchNumber: { type: String, default: '', trim: true },
                        expiryDate: { type: Date, default: null },
                        qty: { type: Number, default: 0, min: 0 }
                    }],
                    default: []
                }
            }],
            default: []
        }
    }
}, { timestamps: true });

const MUTABLE_BILL_FIELDS = new Set([
    'prescriptionStatus',
    'prescriptionNote',
    'prescriptionVerifiedBy',
    'prescriptionVerifiedAt',
    'updatedAt'
]);

const isMutableBillPath = (path) => {
    if (!path) return false;
    const root = String(path).split('.')[0];
    return MUTABLE_BILL_FIELDS.has(root);
};

const collectUpdatePaths = (update = {}) => {
    if (!update || typeof update !== 'object') return [];
    const paths = new Set();
    const keys = Object.keys(update);
    if (!keys.length) return [];

    const hasOperator = keys.some((key) => key.startsWith('$'));
    if (!hasOperator) {
        keys.forEach((key) => paths.add(key));
        return Array.from(paths);
    }

    for (const key of keys) {
        if (!key.startsWith('$')) {
            paths.add(key);
            continue;
        }
        const payload = update[key];
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;
        Object.keys(payload).forEach((field) => paths.add(field));
    }
    return Array.from(paths);
};

const enforceBillImmutability = function enforceBillImmutability() {
    if (this.getOptions?.()?.allowSensitiveBillUpdate) {
        return;
    }
    const changedPaths = collectUpdatePaths(this.getUpdate?.());
    const blocked = changedPaths.filter((path) => !isMutableBillPath(path));
    if (!blocked.length) return;
    throw new Error(`Finalized bill fields are immutable: ${blocked.join(', ')}`);
};

BillSchema.pre('findOneAndUpdate', enforceBillImmutability);
BillSchema.pre('updateOne', enforceBillImmutability);
BillSchema.pre('updateMany', enforceBillImmutability);
BillSchema.pre('replaceOne', enforceBillImmutability);
BillSchema.pre('save', function enforceDocumentImmutability() {
    if (this.isNew) return;
    if (this.$locals?.allowSensitiveBillUpdate) return;
    const changed = this.modifiedPaths().filter((path) => !isMutableBillPath(path));
    if (!changed.length) return;
    throw new Error(`Finalized bill fields are immutable: ${changed.join(', ')}`);
});

BillSchema.index({ user: 1, billNumber: 1 }, { unique: true });
BillSchema.index(
    { user: 1, clientRequestId: 1 },
    { unique: true, partialFilterExpression: { clientRequestId: { $type: 'string', $ne: '' } } }
);
BillSchema.index({ user: 1, customerKey: 1, createdAt: -1 });

module.exports = mongoose.model('Bill', BillSchema);
