// controllers/wishlist.controller.js
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice finalPrice images stock category brand platform rating slug'
      });

    if (!wishlist) {
      // Create empty wishlist if doesn't exist
      wishlist = await Wishlist.create({
        user: req.user._id,
        items: [],
        name: 'My Wishlist'
      });
    }

    res.json({
      success: true,
      wishlist: {
        _id: wishlist._id,
        name: wishlist.name,
        isPublic: wishlist.isPublic,
        shareId: wishlist.shareId,
        totalItems: wishlist.totalItems,
        items: wishlist.items,
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add item to wishlist
// @route   POST /api/wishlist/add/:productId
// @access  Private
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const { note } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user._id,
        items: []
      });
    }

    // Check if product already in wishlist
    const existingItem = wishlist.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add to wishlist
    wishlist.items.push({
      product: productId,
      note: note || ''
    });

    await wishlist.save();

    // Populate product details
    await wishlist.populate({
      path: 'items.product',
      select: 'name price discountPrice finalPrice images stock category brand platform rating slug'
    });

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      wishlist
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/remove/:itemId
// @access  Private
const removeFromWishlist = async (req, res) => {
  try {
    const { itemId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    // Filter out the item
    wishlist.items = wishlist.items.filter(
      item => item._id.toString() !== itemId
    );

    await wishlist.save();

    await wishlist.populate({
      path: 'items.product',
      select: 'name price discountPrice finalPrice images stock category brand platform rating slug'
    });

    res.json({
      success: true,
      message: 'Item removed from wishlist',
      wishlist
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Clear entire wishlist
// @route   DELETE /api/wishlist/clear
// @access  Private
const clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    wishlist.items = [];
    await wishlist.save();

    res.json({
      success: true,
      message: 'Wishlist cleared successfully',
      wishlist
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Move item from wishlist to cart
// @route   POST /api/wishlist/move-to-cart/:itemId
// @access  Private
const moveToCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity = 1, platform } = req.body;

    const wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('items.product');

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    // Find the wishlist item
    const wishlistItem = wishlist.items.find(
      item => item._id.toString() === itemId
    );

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    const product = wishlistItem.product;

    // Check stock
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Get user's cart
    const Cart = require('../models/Cart');
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: []
      });
    }

    // Check if already in cart
    const cartItemIndex = cart.items.findIndex(
      item => item.product.toString() === product._id.toString() && 
              (!platform || item.platform === platform)
    );

    if (cartItemIndex > -1) {
      // Update quantity in cart
      cart.items[cartItemIndex].quantity += quantity;
    } else {
      // Add to cart
      cart.items.push({
        product: product._id,
        quantity,
        platform: platform || product.platform?.[0]
      });
    }

    await cart.save();

    // Remove from wishlist
    wishlist.items = wishlist.items.filter(
      item => item._id.toString() !== itemId
    );
    await wishlist.save();

    res.json({
      success: true,
      message: 'Item moved to cart successfully',
      cart,
      wishlist
    });
  } catch (error) {
    console.error('Move to cart error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update wishlist settings (name, privacy)
// @route   PUT /api/wishlist/settings
// @access  Private
const updateWishlistSettings = async (req, res) => {
  try {
    const { name, isPublic } = req.body;

    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    if (name) wishlist.name = name;
    if (isPublic !== undefined) wishlist.isPublic = isPublic;

    await wishlist.save();

    res.json({
      success: true,
      message: 'Wishlist settings updated',
      wishlist: {
        name: wishlist.name,
        isPublic: wishlist.isPublic,
        shareId: wishlist.shareId
      }
    });
  } catch (error) {
    console.error('Update wishlist settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get public wishlist by share ID
// @route   GET /api/wishlist/shared/:shareId
// @access  Public
const getSharedWishlist = async (req, res) => {
  try {
    const { shareId } = req.params;

    const wishlist = await Wishlist.findOne({ shareId, isPublic: true })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice finalPrice images stock category brand platform rating slug'
      });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Shared wishlist not found or not public'
      });
    }

    // Don't show user info for privacy
    res.json({
      success: true,
      wishlist: {
        name: wishlist.name,
        totalItems: wishlist.totalItems,
        items: wishlist.items,
        createdAt: wishlist.createdAt
      }
    });
  } catch (error) {
    console.error('Get shared wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check if product is in user's wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private
const checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.json({
        success: true,
        inWishlist: false
      });
    }

    const inWishlist = wishlist.items.some(
      item => item.product.toString() === productId
    );

    res.json({
      success: true,
      inWishlist,
      itemId: inWishlist ? 
        wishlist.items.find(item => item.product.toString() === productId)._id : null
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart,
  updateWishlistSettings,
  getSharedWishlist,
  checkWishlist
};