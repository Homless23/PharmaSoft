const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true },
  password: { type: String, required: [true, 'Password required'], minlength: 6, select: false },
  profileImage: { type: String, default: '' },
  theme: { type: String, enum: ['light', 'dark'], default: 'dark' } // NEW: Persistent Theme
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);