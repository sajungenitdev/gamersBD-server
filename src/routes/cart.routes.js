const express = require("express");
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  validateCart,
  testCart,
} = require("../controllers/cart.controller");
const { protect } = require("../middleware/auth.middleware");

console.log("🛒 Initializing cart routes...");


const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  // If authenticated, call next()
  next(); // IMPORTANT: Must call next()
};

// GET /api/cart - Protected route
router.get('/', authMiddleware, (req, res) => {
  res.json({ success: true, cart: [] });
});

module.exports = router;

// Public test route (no auth required)
router.get("/test", testCart);

// Protected routes (auth required for all below)
router.use(protect);

router.get("/", getCart);
router.get("/count", getCartCount);
router.get("/validate", validateCart);
router.post("/add", addToCart);
router.put("/update/:itemId", updateCartItem);
router.delete("/remove/:itemId", removeFromCart);
router.delete("/clear", clearCart);

console.log("✅ Cart routes registered successfully");

module.exports = router;