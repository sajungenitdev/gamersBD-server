const express = require('express');
const router = express.Router();

// Temporary order controller
const orderController = {
  // Get all orders
  getOrders: (req, res) => {
    res.status(200).json({ 
      success: true,
      message: 'Get all orders', 
      data: [] 
    });
  },
  
  // Get single order by ID
  getOrderById: (req, res) => {
    res.status(200).json({ 
      success: true,
      message: `Get order with ID: ${req.params.id}`, 
      data: null 
    });
  },
  
  // Create new order
  createOrder: (req, res) => {
    res.status(201).json({ 
      success: true,
      message: 'Order created successfully', 
      data: req.body 
    });
  },
  
  // Update order status
  updateOrderStatus: (req, res) => {
    res.status(200).json({ 
      success: true,
      message: `Order ${req.params.id} status updated`, 
      data: req.body 
    });
  }
};

// Routes
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;