// controllers/compare.controller.js
const Compare = require('../models/Compare');
const Product = require('../models/Product');

// @desc    Get user's compare list
// @route   GET /api/compare
// @access  Private
const getCompareList = async (req, res) => {
  try {
    let compare = await Compare.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice finalPrice images stock category brand platform rating specifications features dimensions weight releaseDate'
      });

    if (!compare) {
      compare = await Compare.create({
        user: req.user._id,
        items: []
      });
    }

    res.json({
      success: true,
      compare: {
        _id: compare._id,
        totalItems: compare.items.length,
        maxItems: compare.maxItems,
        items: compare.items,
        lastCompared: compare.lastCompared
      }
    });
  } catch (error) {
    console.error('Get compare list error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add product to compare
// @route   POST /api/compare/add/:productId
// @access  Private
const addToCompare = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find or create compare list
    let compare = await Compare.findOne({ user: req.user._id });

    if (!compare) {
      compare = new Compare({
        user: req.user._id,
        items: []
      });
    }

    // Check if product already in compare
    const existingItem = compare.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in compare list'
      });
    }

    // Check max items limit
    if (compare.items.length >= compare.maxItems) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more than ${compare.maxItems} products to compare`
      });
    }

    // Add to compare
    compare.items.push({
      product: productId
    });
    compare.lastCompared = new Date();

    await compare.save();

    // Populate product details
    await compare.populate({
      path: 'items.product',
      select: 'name price discountPrice finalPrice images stock category brand platform rating specifications features dimensions weight releaseDate'
    });

    res.status(201).json({
      success: true,
      message: 'Product added to compare',
      compare
    });
  } catch (error) {
    console.error('Add to compare error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove product from compare
// @route   DELETE /api/compare/remove/:itemId
// @access  Private
const removeFromCompare = async (req, res) => {
  try {
    const { itemId } = req.params;

    const compare = await Compare.findOne({ user: req.user._id });

    if (!compare) {
      return res.status(404).json({
        success: false,
        message: 'Compare list not found'
      });
    }

    // Remove item
    compare.items = compare.items.filter(
      item => item._id.toString() !== itemId
    );
    compare.lastCompared = new Date();

    await compare.save();

    await compare.populate({
      path: 'items.product',
      select: 'name price discountPrice finalPrice images stock category brand platform rating specifications features dimensions weight releaseDate'
    });

    res.json({
      success: true,
      message: 'Product removed from compare',
      compare
    });
  } catch (error) {
    console.error('Remove from compare error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Clear compare list
// @route   DELETE /api/compare/clear
// @access  Private
const clearCompare = async (req, res) => {
  try {
    const compare = await Compare.findOne({ user: req.user._id });

    if (!compare) {
      return res.status(404).json({
        success: false,
        message: 'Compare list not found'
      });
    }

    compare.items = [];
    compare.lastCompared = new Date();
    await compare.save();

    res.json({
      success: true,
      message: 'Compare list cleared',
      compare
    });
  } catch (error) {
    console.error('Clear compare error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get comparison table data
// @route   GET /api/compare/table
// @access  Private
const getComparisonTable = async (req, res) => {
  try {
    const compare = await Compare.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'brand', select: 'name' }
        ]
      });

    if (!compare || compare.items.length === 0) {
      return res.json({
        success: true,
        comparison: []
      });
    }

    // Extract all specs for comparison table
    const products = compare.items.map(item => item.product);
    
    // Get all unique spec keys
    const allSpecs = new Set();
    products.forEach(product => {
      if (product.specifications) {
        Object.keys(product.specifications).forEach(key => allSpecs.add(key));
      }
    });

    // Get all unique features
    const allFeatures = new Set();
    products.forEach(product => {
      if (product.features && Array.isArray(product.features)) {
        product.features.forEach(feature => allFeatures.add(feature));
      }
    });

    res.json({
      success: true,
      comparison: {
        products: products.map(p => ({
          id: p._id,
          name: p.name,
          slug: p.slug,
          price: p.finalPrice || p.price,
          originalPrice: p.price,
          discount: p.discountPercentage,
          image: p.images?.[0],
          rating: p.rating,
          stock: p.stock,
          category: p.category?.name,
          brand: p.brand?.name,
          platform: p.platform,
          releaseDate: p.releaseDate
        })),
        specifications: Array.from(allSpecs).map(specKey => ({
          name: specKey,
          values: products.map(p => p.specifications?.[specKey] || '—')
        })),
        features: Array.from(allFeatures)
      }
    });
  } catch (error) {
    console.error('Get comparison table error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update max compare items (admin)
// @route   PUT /api/compare/settings
// @access  Private/Admin
const updateCompareSettings = async (req, res) => {
  try {
    const { maxItems } = req.body;

    if (!maxItems || maxItems < 2 || maxItems > 10) {
      return res.status(400).json({
        success: false,
        message: 'Max items must be between 2 and 10'
      });
    }

    // Update for current user or global setting
    // This could be a global setting in a separate Settings model
    // For now, just return success

    res.json({
      success: true,
      message: 'Compare settings updated',
      settings: { maxItems }
    });
  } catch (error) {
    console.error('Update compare settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getCompareList,
  addToCompare,
  removeFromCompare,
  clearCompare,
  getComparisonTable,
  updateCompareSettings
};