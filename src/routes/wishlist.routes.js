// routes/wishlist.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart,
  updateWishlistSettings,
  getSharedWishlist,
  checkWishlist
} = require('../controllers/wishlist.controller');

// Public route
router.get('/shared/:shareId', getSharedWishlist);

// Protected routes
router.use(protect);

router.get('/', getWishlist);
router.get('/check/:productId', checkWishlist);
router.post('/add/:productId', addToWishlist);
router.post('/move-to-cart/:itemId', moveToCart);
router.put('/settings', updateWishlistSettings);
router.delete('/remove/:itemId', removeFromWishlist);
router.delete('/clear', clearWishlist);

module.exports = router;