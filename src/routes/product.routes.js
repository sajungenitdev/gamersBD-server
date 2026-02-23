const express = require('express');
const router = express.Router();

// Temporary product controller
const productController = {
  // Get all products
  getProducts: (req, res) => {
    res.status(200).json({ 
      success: true,
      message: 'Get all products', 
      data: [] 
    });
  },
  
  // Get single product by ID
  getProductById: (req, res) => {
    res.status(200).json({ 
      success: true,
      message: `Get product with ID: ${req.params.id}`, 
      data: null 
    });
  },
  
  // Create new product
  createProduct: (req, res) => {
    res.status(201).json({ 
      success: true,
      message: 'Product created successfully', 
      data: req.body 
    });
  },
  
  // Update product
  updateProduct: (req, res) => {
    res.status(200).json({ 
      success: true,
      message: `Product ${req.params.id} updated successfully`, 
      data: req.body 
    });
  },
  
  // Delete product
  deleteProduct: (req, res) => {
    res.status(200).json({ 
      success: true,
      message: `Product ${req.params.id} deleted successfully` 
    });
  }
};

// Routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;