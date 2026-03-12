// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  platform: String,
  priceAtTime: {
    type: Number,
    required: true
  }
});

// Tracking history schema
const trackingHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'refunded', 'on_hold'],
    required: true
  },
  note: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Payment details schema
const paymentDetailsSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['bkash', 'nagad', 'rocket', 'credit_card', 'debit_card', 'cash_on_delivery'],
    required: true
  },
  transactionId: String,
  reference: String,
  amount: Number,
  currency: {
    type: String,
    default: 'BDT'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  mobileNumber: String,
  cardLast4: String,
  cardBrand: String,
  gatewayResponse: mongoose.Schema.Types.Mixed,
  requestedAt: Date,
  completedAt: Date,
  refundedAt: Date
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  
  // Price breakdown
  subtotal: {
    type: Number,
    required: true
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  
  // Payment information
  payment: paymentDetailsSchema,
  
  // Order status - Complete workflow
  status: {
    type: String,
    enum: [
      'pending',           // Order placed, payment pending
      'confirmed',         // Payment confirmed, order accepted
      'processing',        // Being prepared
      'shipped',           // Handed to courier
      'in_transit',        // On the way
      'out_for_delivery',  // Out for local delivery
      'delivered',         // Successfully delivered
      'cancelled',         // Cancelled by user/admin
      'refunded',          // Money returned
      'on_hold'            // Temporarily paused
    ],
    default: 'pending'
  },
  
  // Status history for tracking
  statusHistory: [trackingHistorySchema],
  
  // Tracking information
  trackingNumber: String,
  carrier: String,
  trackingUrl: String,
  estimatedDelivery: Date,
  actualDelivery: Date,
  
  // Shipping information
  shippingAddress: {
    fullName: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true }
  },
  
  billingAddress: {
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    phone: String
  },
  
  notes: String,
  adminNotes: String,
  
  // Timestamps
  placedAt: Date,
  confirmedAt: Date,
  processedAt: Date,
  shippedAt: Date,
  inTransitAt: Date,
  outForDeliveryAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  refundedAt: Date,
  onHoldAt: Date
}, {
  timestamps: true
});

// Generate order number before save
orderSchema.pre('save', async function(next) {
  try {
    if (!this.orderNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      const count = await mongoose.model('Order').countDocuments({
        createdAt: { 
          $gte: new Date(date.setHours(0, 0, 0, 0)), 
          $lte: new Date(date.setHours(23, 59, 59, 999)) 
        }
      });
      
      this.orderNumber = `ORD-${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Order', orderSchema);