const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubcategories
} = require('../controllers/category.controller');

// Get all categories
router.get('/', getCategories);

// Get subcategories of a category
router.get('/:id/subcategories', getSubcategories);

// Get single category by ID
router.get('/:id', getCategoryById);

// Create new category
router.post('/', createCategory);

// Update category
router.put('/:id', updateCategory);

// Delete category
router.delete('/:id', deleteCategory);

module.exports = router;