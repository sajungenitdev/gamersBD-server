// routes/order.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getPaymentDetails,
  getOrderTracking,
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  addTrackingInfo,
  getOrderStats,
  verifyPayment,
  bulkUpdateOrderStatus
} = require('../controllers/order.controller');
const {
  downloadInvoice,
  previewInvoice
} = require('../controllers/invoice.controller');

// All order routes require authentication
router.use(protect);

// User routes
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);
router.get('/:id/payment', getPaymentDetails);
router.get('/:id/tracking', getOrderTracking);
router.post('/checkout', createOrder);
router.put('/:id/cancel', cancelOrder);

// Admin/Editor routes
router.get('/', authorize('admin', 'editor'), getAllOrders);
router.get('/stats/dashboard', authorize('admin', 'editor'), getOrderStats);
router.put('/bulk-status', authorize('admin'), bulkUpdateOrderStatus);
router.put('/:id/status', authorize('admin', 'editor'), updateOrderStatus);
router.put('/:id/payment', authorize('admin', 'editor'), updatePaymentStatus);
router.put('/:id/tracking', authorize('admin', 'editor'), addTrackingInfo);

router.get('/:orderId/invoice', protect, downloadInvoice);
router.get('/:orderId/invoice/preview', protect, previewInvoice);

// Public webhook (no auth)
router.post('/verify-payment', verifyPayment);

module.exports = router;