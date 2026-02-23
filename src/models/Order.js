const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    image: String,
    platform: String // For games
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    zipCode: { type: String, required: true },
    country: { type: String, default: 'Bangladesh' },
    phone: { type: String, required: true }
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'bkash', 'nagad', 'rocket', 'card'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingMethod: {
    type: String,
    enum: ['standard', 'express'],
    default: 'standard'
  },
  shippingCost: {
    type: Number,
    default: 60 // Standard shipping in Bangladesh
  },
  trackingNumber: String,
  estimatedDelivery: Date,
  notes: String,
  orderDate: {
    type: Date,
    default: Date.now
  },
  deliveredAt: Date,
  cancelledAt: Date
}, {
  timestamps: true
});

// Generate order number
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    this.orderNumber = `ORD-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${this._id.toString().slice(-6).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);