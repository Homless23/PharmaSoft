const mongoose = require('mongoose');
const { Schema } = mongoose;

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
    budget: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('category', CategorySchema);
