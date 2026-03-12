// controllers/email.controller.js
const emailService = require('../services/email.service');
const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Send order confirmation email
// @route   POST /api/email/send-order-confirmation
// @access  Private/Admin
const sendOrderConfirmation = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId)
      .populate('user')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const result = await emailService.sendOrderConfirmation(order, order.user);

    if (result.success) {
      res.json({
        success: true,
        message: 'Order confirmation email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send order confirmation email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send order status update email
// @route   POST /api/email/send-status-update
// @access  Private/Admin
const sendStatusUpdate = async (req, res) => {
  try {
    const { orderId, message } = req.body;

    const order = await Order.findById(orderId)
      .populate('user')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const result = await emailService.sendOrderStatusUpdate(order, order.user, message);

    if (result.success) {
      res.json({
        success: true,
        message: 'Status update email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send status update email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send welcome email
// @route   POST /api/email/send-welcome
// @access  Private/Admin
const sendWelcomeEmail = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const result = await emailService.sendWelcomeEmail(user);

    if (result.success) {
      res.json({
        success: true,
        message: 'Welcome email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send welcome email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Test email configuration
// @route   GET /api/email/test
// @access  Private/Admin
const testEmail = async (req, res) => {
  try {
    const testUser = {
      name: 'Test User',
      email: req.user.email
    };

    const testOrder = {
      orderNumber: 'TEST-123456',
      _id: 'test123',
      createdAt: new Date(),
      payment: { method: 'bkash', status: 'completed' },
      items: [{
        product: { name: 'Test Product' },
        quantity: 2,
        priceAtTime: 999
      }],
      subtotal: 1998,
      shippingCost: 50,
      tax: 199.8,
      total: 2247.8,
      shippingAddress: {
        fullName: 'Test User',
        addressLine1: '123 Test St',
        city: 'Dhaka',
        state: 'Dhaka',
        postalCode: '1207',
        country: 'Bangladesh',
        phone: '01712345678'
      }
    };

    const result = await emailService.sendOrderConfirmation(testOrder, testUser);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  sendOrderConfirmation,
  sendStatusUpdate,
  sendWelcomeEmail,
  testEmail
};