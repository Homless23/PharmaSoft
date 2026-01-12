const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  budget: {
    type: Number,
    default: 0
  }
});


module.exports = mongoose.model('Category', categorySchema);