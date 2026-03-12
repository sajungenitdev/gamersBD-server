// models/Wishlist.js
const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  note: String // User can add personal note
});

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One wishlist per user
  },
  items: [wishlistItemSchema],
  name: {
    type: String,
    default: 'My Wishlist'
  },
  isPublic: {
    type: Boolean,
    default: false // Can share wishlist with others
  },
  shareId: {
    type: String,
    unique: true,
    sparse: true // For public sharing
  },
  totalItems: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate share ID for public wishlist
wishlistSchema.pre('save', async function(next) {
  if (this.isPublic && !this.shareId) {
    this.shareId = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
  }
  this.totalItems = this.items.length;
  next();
});

module.exports = mongoose.model('Wishlist', wishlistSchema);