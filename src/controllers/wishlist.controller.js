const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// Helper function to calculate final price
const getFinalPrice = (product) => {
  if (!product) return 0;
  if (product.discountPrice && product.discountPrice < product.price) {
    return product.discountPrice;
  }
  return product.price;
};

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res) => {
  try {
    console.log('Fetching wishlist for user:', req.user._id);

    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice images stock category brand platform rating slug description',
        populate: {
          path: 'category',
          select: 'name slug'
        }
      });

    if (!wishlist) {
      console.log('Creating new wishlist for user:', req.user._id);
      // Create empty wishlist if doesn't exist
      wishlist = await Wishlist.create({
        user: req.user._id,
        items: [],
        name: 'My Wishlist'
      });
    }

    // Add finalPrice to each product and filter out null products
    const validItems = wishlist.items.filter(item => item.product !== null);
    const enrichedItems = validItems.map(item => {
      const product = item.product;
      const productObj = product.toObject ? product.toObject() : product;
      return {
        _id: item._id,
        product: {
          ...productObj,
          finalPrice: getFinalPrice(productObj)
        },
        addedAt: item.addedAt,
        note: item.note
      };
    });

    res.json({
      success: true,
      wishlist: {
        _id: wishlist._id,
        name: wishlist.name,
        isPublic: wishlist.isPublic,
        shareId: wishlist.shareId,
        totalItems: enrichedItems.length,
        items: enrichedItems,
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    console.log('Adding to wishlist:', { userId: req.user._id, productId });

    // Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

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
      select: 'name price discountPrice images stock category brand platform rating slug'
    });

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      wishlist: {
        _id: wishlist._id,
        name: wishlist.name,
        isPublic: wishlist.isPublic,
        shareId: wishlist.shareId,
        totalItems: wishlist.items.length,
        items: wishlist.items,
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt
      }
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

    console.log('Removing from wishlist:', { userId: req.user._id, itemId });

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
      select: 'name price discountPrice images stock category brand platform rating slug'
    });

    res.json({
      success: true,
      message: 'Item removed from wishlist',
      wishlist: {
        _id: wishlist._id,
        name: wishlist.name,
        isPublic: wishlist.isPublic,
        shareId: wishlist.shareId,
        totalItems: wishlist.items.length,
        items: wishlist.items,
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt
      }
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.json({
        success: true,
        inWishlist: false,
        itemId: null
      });
    }

    const wishlistItem = wishlist.items.find(
      item => item.product.toString() === productId
    );

    res.json({
      success: true,
      inWishlist: !!wishlistItem,
      itemId: wishlistItem ? wishlistItem._id : null
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check if product is in user's wishlist
// @route   GET /api/wishlist/check/:productId
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

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available`
      });
    }

    // Get or create cart
    const Cart = require('../models/Cart');
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: []
      });
    }

    const cartItemIndex = cart.items.findIndex(
      item => item.product.toString() === product._id.toString()
    );

    if (cartItemIndex > -1) {
      cart.items[cartItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: product._id,
        quantity,
        platform: platform || product.platform?.[0] || 'PS5'
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
      message: 'Item moved to cart',
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
      message: 'Settings updated',
      wishlist: {
        name: wishlist.name,
        isPublic: wishlist.isPublic,
        shareId: wishlist.shareId
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
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
        select: 'name price discountPrice images stock category brand platform rating slug'
      });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found or not public'
      });
    }

    res.json({
      success: true,
      wishlist: {
        name: wishlist.name,
        totalItems: wishlist.items.length,
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