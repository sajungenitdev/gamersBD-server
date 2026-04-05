// routes/category.routes.js
const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubcategories,
  getSubcategoryBySlug,
  getProductsByCategory,
  getCategoryTree
} = require('../controllers/category.controller');

// Public routes
router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/slug/:categorySlug/:subcategorySlug', getSubcategoryBySlug);
router.get('/:id/subcategories', getSubcategories);
router.get('/:id/products', getProductsByCategory);  // Fixed: Changed endpoint
router.get('/:id', getCategoryById);

// Protected routes (add auth middleware)
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;