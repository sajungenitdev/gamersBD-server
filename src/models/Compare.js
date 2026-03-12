// models/Compare.js
const mongoose = require('mongoose');

const compareItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const compareSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [compareItemSchema],
  maxItems: {
    type: Number,
    default: 4 // Usually compare up to 4 products
  },
  lastCompared: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Compare', compareSchema);