// routes/category.routes.js (Updated)
const express = require('express');
const router = express.Router();
const Category = require('../models/Category'); // ← ADD THIS LINE
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
  getCategoryTree,
  clearCategoryCache
} = require('../controllers/category.controller');

// Cache middleware for public routes
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${duration}`);
    next();
  };
};

// Public routes with caching
router.get('/', cacheMiddleware(300), getCategories);
router.get('/tree', cacheMiddleware(600), getCategoryTree);
router.get('/slug/:slug', cacheMiddleware(300), getCategoryBySlug);
router.get('/slug/:categorySlug/:subcategorySlug', cacheMiddleware(300), getSubcategoryBySlug);
router.get('/:id/subcategories', cacheMiddleware(300), getSubcategories);
router.get('/:id/products', cacheMiddleware(120), getProductsByCategory);
router.get('/:id', cacheMiddleware(300), getCategoryById);

// Admin routes (no cache)
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.post('/clear-cache', clearCategoryCache); // Admin only

// Debug route - Add this at the end
router.get('/debug/all', async (req, res) => {
  try {
    const total = await Category.countDocuments();
    const active = await Category.countDocuments({ isActive: true });
    const inactive = await Category.countDocuments({ isActive: false });
    const allActive = await Category.find({ isActive: true }).lean();
    
    res.json({
      success: true,
      total,
      active,
      inactive,
      activeList: allActive.map(c => ({ 
        id: c._id, 
        name: c.name, 
        isActive: c.isActive,
        parent: c.parent 
      }))
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;