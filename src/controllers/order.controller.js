// controllers/order.controller.js
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User"); // Make sure to import User
const emailService = require('../services/email.service');

// @desc    Create order from cart
// @route   POST /api/orders/checkout
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { shippingAddress, billingAddress, payment, notes } = req.body;

    // Validate payment info
    if (!payment || !payment.method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    // Validate transaction ID for online payments
    const onlineMethods = [
      "bkash",
      "nagad",
      "rocket",
      "credit_card",
      "debit_card",
    ];
    if (onlineMethods.includes(payment.method) && !payment.transactionId) {
      return res.status(400).json({
        success: false,
        message: `Transaction ID is required for ${payment.method} payment`,
      });
    }

    // For mobile banking, validate mobile number
    const mobileMethods = ["bkash", "nagad", "rocket"];
    if (mobileMethods.includes(payment.method) && !payment.mobileNumber) {
      return res.status(400).json({
        success: false,
        message: `Mobile number is required for ${payment.method} payment`,
      });
    }

    // Get user's cart with populated products
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product",
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Validate stock for each item
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`,
        });
      }
    }

    // Calculate totals
    const subtotal = cart.totalPrice;
    const shippingCost = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const tax = subtotal * 0.1; // 10% tax
    const discount = 0; // You can add coupon logic here
    const total = subtotal + shippingCost + tax - discount;

    // Create order items
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      platform: item.platform,
      priceAtTime: item.product.finalPrice || item.product.price,
    }));

    // Generate order number
    const generateOrderNumber = () => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      return `ORD-${year}${month}${day}-${random}`;
    };

    const orderNumber = generateOrderNumber();

    // Initial status - determine based on payment method
    const initialStatus = payment.method === "cash_on_delivery" ? "pending" : "confirmed";
    
    // Create status history
    const statusHistory = [{
      status: initialStatus,
      note: `Order placed with ${payment.method} payment`,
      updatedBy: req.user._id,
      updatedAt: new Date()
    }];

    // Prepare payment details
    const paymentDetails = {
      method: payment.method,
      transactionId: payment.transactionId,
      amount: total,
      currency: payment.currency || "BDT",
      status: payment.method === "cash_on_delivery" ? "pending" : "completed",
      mobileNumber: payment.mobileNumber,
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      gatewayResponse: payment.gatewayResponse || {},
      requestedAt: new Date(),
      completedAt: payment.method !== "cash_on_delivery" ? new Date() : null,
    };

    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      orderNumber,
      subtotal,
      shippingCost,
      tax,
      discount,
      total,
      payment: paymentDetails,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      notes: notes || "",
      status: initialStatus,
      statusHistory,
      placedAt: new Date(),
      confirmedAt: payment.method !== "cash_on_delivery" ? new Date() : null
    });

    // Update product stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: {
          stock: -item.quantity,
          soldCount: item.quantity,
        },
      });
    }

    // Clear cart
    cart.items = [];
    cart.totalItems = 0;
    cart.totalPrice = 0;
    await cart.save();

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate("items.product", "name price images slug")
      .populate("user", "name email phone");

    // ============================================
    // 📧 SEND ORDER CONFIRMATION EMAIL (ASYNC)
    // ============================================
    try {
      // Send email asynchronously - don't await to not block response
      emailService.sendOrderConfirmation(populatedOrder, req.user)
        .then(result => {
          if (result.success) {
            console.log(`✅ Order confirmation email sent for order ${orderNumber}`);
          } else {
            console.error(`❌ Failed to send order confirmation email:`, result.error);
          }
        })
        .catch(err => {
          console.error('❌ Order confirmation email error:', err.message);
        });
    } catch (emailError) {
      // Log but don't fail the order if email fails
      console.error('📧 Email sending error (non-blocking):', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get logged in user's orders
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort("-createdAt")
      .populate("items.product", "name price images slug");

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product", "name price images slug")
      .populate("user", "name email phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order belongs to user or user is admin
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin" && req.user.role !== "editor"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cancel order (user)
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this order",
      });
    }

    // Check if order can be cancelled (only pending or confirmed)
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in ${order.status} status`,
      });
    }

    // Update order status
    order.status = "cancelled";
    order.cancelledAt = new Date();
    
    // Add to status history
    order.statusHistory.push({
      status: "cancelled",
      note: "Order cancelled by user",
      updatedBy: req.user._id,
      updatedAt: new Date()
    });
    
    await order.save();

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {
          stock: item.quantity,
          soldCount: -item.quantity,
        },
      });
    }

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ADMIN/EDITOR CONTROLLERS
// ============================================

// @desc    Get all orders (admin/editor only)
// @route   GET /api/orders
// @access  Private/Admin/Editor
const getAllOrders = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter by status if provided
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.paymentStatus) {
      filter["payment.status"] = req.query.paymentStatus;
    }

    const orders = await Order.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate("user", "name email phone")
      .populate("items.product", "name price");

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      count: orders.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      orders,
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update order status with full workflow (admin/editor)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin/Editor
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    // Complete status workflow
    const validStatuses = [
      "pending",           // Order placed, payment pending
      "confirmed",         // Payment confirmed, order accepted
      "processing",        // Being prepared
      "shipped",           // Handed to courier
      "in_transit",        // On the way
      "out_for_delivery",  // Out for local delivery
      "delivered",         // Successfully delivered
      "cancelled",         // Cancelled by user/admin
      "refunded",          // Money returned
      "on_hold"            // Temporarily paused
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Define valid status transitions
    const validTransitions = {
      'pending': ['confirmed', 'cancelled', 'on_hold'],
      'confirmed': ['processing', 'cancelled', 'on_hold', 'refunded'],
      'processing': ['shipped', 'cancelled', 'on_hold'],
      'shipped': ['in_transit', 'cancelled', 'on_hold'],
      'in_transit': ['out_for_delivery', 'cancelled', 'on_hold'],
      'out_for_delivery': ['delivered', 'cancelled', 'on_hold'],
      'delivered': ['refunded'],
      'cancelled': [],
      'refunded': [],
      'on_hold': ['confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'cancelled']
    };

    // Check if transition is valid
    if (order.status !== status && !validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${order.status} to ${status}`,
      });
    }

    // Handle stock for cancelled/refunded orders
    if ((status === 'cancelled' || status === 'refunded') && 
        order.status !== 'cancelled' && order.status !== 'refunded') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
    }

    // Update timestamps based on status
    const timestampFields = {
      'confirmed': 'confirmedAt',
      'processing': 'processedAt',
      'shipped': 'shippedAt',
      'in_transit': 'inTransitAt',
      'out_for_delivery': 'outForDeliveryAt',
      'delivered': 'deliveredAt',
      'cancelled': 'cancelledAt',
      'refunded': 'refundedAt',
      'on_hold': 'onHoldAt'
    };

    if (timestampFields[status] && order.status !== status) {
      order[timestampFields[status]] = new Date();
    }

    // Add to status history
    order.statusHistory.push({
      status,
      note: note || `Status updated to ${status}`,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    // Update order status
    order.status = status;
    await order.save();

    // ============================================
    // 📧 SEND STATUS UPDATE EMAIL (ASYNC)
    // ============================================
    try {
      // Get user info for email
      const user = await User.findById(order.user);
      
      if (user && user.email) {
        // Send email asynchronously - don't await to not block response
        emailService.sendOrderStatusUpdate(order, user, note)
          .then(result => {
            if (result.success) {
              console.log(`✅ Status update email sent for order ${order.orderNumber}`);
            } else {
              console.error(`❌ Failed to send status update email:`, result.error);
            }
          })
          .catch(err => {
            console.error('❌ Status update email error:', err.message);
          });
      }
    } catch (emailError) {
      // Log but don't fail the status update if email fails
      console.error('📧 Email sending error (non-blocking):', emailError.message);
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update payment status (admin/editor only)
// @route   PUT /api/orders/:id/payment
// @access  Private/Admin/Editor
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, transactionId, mobileNumber, gatewayResponse, note } =
      req.body;

    const validStatuses = ["pending", "completed", "failed", "refunded"];

    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update payment details
    order.payment.status = paymentStatus;

    if (transactionId) {
      order.payment.transactionId = transactionId;
    }

    if (mobileNumber) {
      order.payment.mobileNumber = mobileNumber;
    }

    if (gatewayResponse) {
      order.payment.gatewayResponse = gatewayResponse;
    }

    // Set timestamps based on status
    if (paymentStatus === "completed" && order.payment.status !== "completed") {
      order.payment.completedAt = new Date();
      
      // Add to status history
      order.statusHistory.push({
        status: order.status,
        note: note || "Payment completed",
        updatedBy: req.user._id,
        updatedAt: new Date()
      });
      
    } else if (paymentStatus === "refunded" && order.payment.status !== "refunded") {
      order.payment.refundedAt = new Date();
      
      // Add to status history
      order.statusHistory.push({
        status: order.status,
        note: note || "Payment refunded",
        updatedBy: req.user._id,
        updatedAt: new Date()
      });

      // Restore stock for refunded orders if not already done
      if (order.status !== 'cancelled' && order.status !== 'refunded') {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity }
          });
        }
      }
    }

    await order.save();

    // ============================================
    // 📧 SEND PAYMENT UPDATE EMAIL (ASYNC)
    // ============================================
    try {
      const user = await User.findById(order.user);
      
      if (user && user.email) {
        const paymentMessage = `Payment status updated to ${paymentStatus}`;
        emailService.sendOrderStatusUpdate(order, user, paymentMessage)
          .catch(err => console.error('Payment update email error:', err.message));
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError.message);
    }

    res.json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      order,
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add tracking information (admin/editor only)
// @route   PUT /api/orders/:id/tracking
// @access  Private/Admin/Editor
const addTrackingInfo = async (req, res) => {
  try {
    const { trackingNumber, carrier, trackingUrl, estimatedDelivery } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.trackingNumber = trackingNumber;
    order.carrier = carrier || order.carrier;
    
    if (trackingUrl) {
      order.trackingUrl = trackingUrl;
    }
    
    if (estimatedDelivery) {
      order.estimatedDelivery = new Date(estimatedDelivery);
    }

    // Add to status history
    order.statusHistory.push({
      status: order.status,
      note: `Tracking info added: ${trackingNumber} (${carrier})`,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    await order.save();

    // ============================================
    // 📧 SEND TRACKING UPDATE EMAIL (ASYNC)
    // ============================================
    try {
      const user = await User.findById(order.user);
      
      if (user && user.email) {
        const trackingMessage = `Tracking number ${trackingNumber} added via ${carrier}`;
        emailService.sendOrderStatusUpdate(order, user, trackingMessage)
          .catch(err => console.error('Tracking update email error:', err.message));
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError.message);
    }

    res.json({
      success: true,
      message: "Tracking information added successfully",
      order,
    });
  } catch (error) {
    console.error("Add tracking info error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get order tracking history
// @route   GET /api/orders/:id/tracking
// @access  Private
const getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('orderNumber status statusHistory trackingNumber carrier trackingUrl estimatedDelivery actualDelivery');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization
    const orderWithUser = await Order.findById(req.params.id).select('user');
    if (orderWithUser.user.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    res.json({
      success: true,
      tracking: {
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        trackingUrl: order.trackingUrl,
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        history: order.statusHistory.sort((a, b) => b.updatedAt - a.updatedAt)
      }
    });
  } catch (error) {
    console.error("Get order tracking error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get payment details for an order
// @route   GET /api/orders/:id/payment
// @access  Private
const getPaymentDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select("orderNumber payment status user") // Make sure to select user field
      .populate("user", "name email"); // Populate user to get the ID

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order belongs to user or user is admin/editor
    const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
    const isAdminOrEditor = req.user.role === "admin" || req.user.role === "editor";

    if (!isOwner && !isAdminOrEditor) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    res.json({
      success: true,
      payment: order.payment || {
        method: "Not set",
        status: "pending",
        transactionId: null,
      },
    });
  } catch (error) {
    console.error("Get payment details error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify payment (for payment gateway webhook)
// @route   POST /api/orders/verify-payment
// @access  Public (webhook)
const verifyPayment = async (req, res) => {
  try {
    const { transactionId, orderNumber, status, gatewayResponse } = req.body;

    const order = await Order.findOne({ orderNumber });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update payment status
    order.payment.status = status === "success" ? "completed" : "failed";
    order.payment.gatewayResponse = gatewayResponse;

    if (status === "success") {
      order.payment.completedAt = new Date();
      order.status = "confirmed";
      order.confirmedAt = new Date();
      
      // Add to status history
      order.statusHistory.push({
        status: "confirmed",
        note: "Payment verified via webhook",
        updatedAt: new Date()
      });
    }

    await order.save();

    // ============================================
    // 📧 SEND PAYMENT VERIFICATION EMAIL (ASYNC)
    // ============================================
    try {
      const user = await User.findById(order.user);
      
      if (user && user.email) {
        const verificationMessage = status === "success" 
          ? "Your payment has been verified successfully!" 
          : "Payment verification failed. Please contact support.";
        
        emailService.sendOrderStatusUpdate(order, user, verificationMessage)
          .catch(err => console.error('Verification email error:', err.message));
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError.message);
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      order,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get order statistics (admin/editor only)
// @route   GET /api/orders/stats/dashboard
// @access  Private/Admin/Editor
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    
    // Count by all statuses
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const confirmedOrders = await Order.countDocuments({ status: "confirmed" });
    const processingOrders = await Order.countDocuments({ status: "processing" });
    const shippedOrders = await Order.countDocuments({ status: "shipped" });
    const inTransitOrders = await Order.countDocuments({ status: "in_transit" });
    const outForDeliveryOrders = await Order.countDocuments({ status: "out_for_delivery" });
    const deliveredOrders = await Order.countDocuments({ status: "delivered" });
    const cancelledOrders = await Order.countDocuments({ status: "cancelled" });
    const refundedOrders = await Order.countDocuments({ status: "refunded" });
    const onHoldOrders = await Order.countDocuments({ status: "on_hold" });

    const paidOrders = await Order.countDocuments({ "payment.status": "completed" });
    const pendingPayment = await Order.countDocuments({ "payment.status": "pending" });
    const failedPayments = await Order.countDocuments({ "payment.status": "failed" });

    // Total revenue from delivered and paid orders
    const revenueResult = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          "payment.status": "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.json({
      success: true,
      stats: {
        totalOrders,
        byStatus: {
          pending: pendingOrders,
          confirmed: confirmedOrders,
          processing: processingOrders,
          shipped: shippedOrders,
          in_transit: inTransitOrders,
          out_for_delivery: outForDeliveryOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
          refunded: refundedOrders,
          on_hold: onHoldOrders,
        },
        byPayment: {
          paid: paidOrders,
          pending: pendingPayment,
          failed: failedPayments,
        },
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk update orders (admin only)
// @route   PUT /api/orders/bulk-status
// @access  Private/Admin
const bulkUpdateOrderStatus = async (req, res) => {
  try {
    const { orderIds, status, note } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order IDs array is required",
      });
    }

    const validStatuses = [
      "pending", "confirmed", "processing", "shipped", 
      "in_transit", "out_for_delivery", "delivered", 
      "cancelled", "refunded", "on_hold"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { 
        $set: { status },
        $push: {
          statusHistory: {
            status,
            note: note || `Bulk status update to ${status}`,
            updatedBy: req.user._id,
            updatedAt: new Date()
          }
        }
      }
    );

    // Note: Bulk updates don't send individual emails to prevent spam
    // You could implement a summary email for admin if needed

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} orders`,
      result,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Export all functions
module.exports = {
  // User functions
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getPaymentDetails,
  getOrderTracking,

  // Admin/Editor functions
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  addTrackingInfo,
  getOrderStats,
  verifyPayment,
  bulkUpdateOrderStatus,
};