const express = require('express');
const router = express.Router();

const cartController = {
  getCart: (req, res) => {
    res.status(200).json({ success: true, message: 'Get cart', data: { items: [] } });
  },
  addToCart: (req, res) => {
    res.status(200).json({ success: true, message: 'Added to cart', data: req.body });
  },
  removeFromCart: (req, res) => {
    res.status(200).json({ success: true, message: `Removed item ${req.params.id} from cart` });
  },
  clearCart: (req, res) => {
    res.status(200).json({ success: true, message: 'Cart cleared' });
  }
};

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.delete('/remove/:id', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

module.exports = router;