// routes/compare.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getCompareList,
  addToCompare,
  removeFromCompare,
  clearCompare,
  getComparisonTable,
  updateCompareSettings
} = require('../controllers/compare.controller');

// All routes are protected
router.use(protect);

router.get('/', getCompareList);
router.get('/table', getComparisonTable);
router.post('/add/:productId', addToCompare);
router.delete('/remove/:itemId', removeFromCompare);
router.delete('/clear', clearCompare);
router.put('/settings', authorize('admin'), updateCompareSettings);

module.exports = router;