// routes/email.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  sendOrderConfirmation,
  sendStatusUpdate,
  sendWelcomeEmail,
  testEmail
} = require('../controllers/email.controller');

// All email routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.post('/send-order-confirmation', sendOrderConfirmation);
router.post('/send-status-update', sendStatusUpdate);
router.post('/send-welcome', sendWelcomeEmail);
router.get('/test', testEmail);

module.exports = router;