// controllers/product.controller.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const NodeCache = require('node-cache');

// Initialize cache with 5 minutes TTL
const productCache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60,
  useClones: false
});

// Helper function to generate cache key
const getCacheKey = (prefix, params = {}) => {
  return `${prefix}_${JSON.stringify(params)}`;
};

// Helper to clear all product caches
const clearProductCaches = () => {
  productCache.flushAll();
  console.log('🗑️ All product caches cleared');
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Validate category exists
    const category = await Category.findById(productData.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // Validate brand is provided
    if (!productData.brand) {
      return res.status(400).json({
        success: false,
        message: "Brand is required",
      });
    }

    // Validate base64 images (optimized validation)
    const validateImage = (img) => img && !img.startsWith("data:image");
    
    if (productData.mainImage && validateImage(productData.mainImage)) {
      return res.status(400).json({
        success: false,
        message: "Main image must be a valid base64 image",
      });
    }

    if (productData.images && Array.isArray(productData.images)) {
      for (let img of productData.images) {
        if (validateImage(img)) {
          return res.status(400).json({
            success: false,
            message: "All images must be valid base64 images",
          });
        }
      }
    }

    const product = await Product.create(productData);

    // Update category product count
    await Category.findByIdAndUpdate(productData.category, {
      $inc: { productCount: 1 },
    });

    // Clear caches
    clearProductCaches();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all products (OPTIMIZED with caching)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      category,
      type,
      platform,
      genre,
      brand,
      minPrice,
      maxPrice,
      search,
      isFeatured,
      inStock,
      offerType,
    } = req.query;

    // Create cache key based on all query params
    const cacheKey = getCacheKey('products', req.query);
    
    // Check cache
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      console.log('✅ Returning cached products');
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'public, max-age=300');
      return res.status(200).json({
        ...cachedData,
        cached: true
      });
    }

    // Build filter
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (platform) filter.platform = platform;
    if (genre) filter.genre = genre;
    if (brand) filter.brand = brand;
    if (isFeatured === "true") filter.isFeatured = true;
    if (inStock === "true") filter.stock = { $gt: 0 };
    if (offerType) filter.offerType = offerType;

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Search optimization
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Run queries in parallel for better performance
    const [products, total, brands] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .populate('brand', 'name logo')
        .select('-__v') // Exclude version field
        .lean() // Use lean for better performance
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .maxTimeMS(5000), // 5 second timeout
      Product.countDocuments(filter),
      Product.distinct("brand", { isActive: true })
    ]);

    const response = {
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      filters: { brands },
      data: products,
    };

    // Cache the response
    productCache.set(cacheKey, response);
    
    // Set cache headers
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.set('X-Cache', 'MISS');
    res.set('X-Response-Time', Date.now());

    res.status(200).json(response);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single product by ID (OPTIMIZED)
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = getCacheKey('product', { id });
    
    // Check cache
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      console.log('✅ Returning cached product');
      res.set('X-Cache', 'HIT');
      return res.status(200).json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    const product = await Product.findById(id)
      .populate('category', 'name slug')
      .populate('brand', 'name logo')
      .lean()
      .maxTimeMS(3000);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment views asynchronously (don't wait)
    Product.findByIdAndUpdate(id, { $inc: { views: 1 } }).catch(console.error);

    // Cache the product
    productCache.set(cacheKey, product);
    res.set('Cache-Control', 'public, max-age=300');

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.views;
    delete updates.soldCount;
    delete updates.createdAt;

    // If category is being updated, update product counts
    if (updates.category) {
      const oldProduct = await Product.findById(req.params.id);
      if (oldProduct && oldProduct.category.toString() !== updates.category) {
        await Promise.all([
          Category.findByIdAndUpdate(oldProduct.category, { $inc: { productCount: -1 } }),
          Category.findByIdAndUpdate(updates.category, { $inc: { productCount: 1 } })
        ]);
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("category", "name slug").lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Clear all caches
    clearProductCaches();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Decrement category product count
    await Category.findByIdAndUpdate(product.category, {
      $inc: { productCount: -1 },
    });

    await product.deleteOne();
    
    // Clear all caches
    clearProductCaches();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get products by category (OPTIMIZED)
// @route   GET /api/products/category/:categoryId
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const cacheKey = getCacheKey('products_by_category', { categoryId, page, limit });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find({ category: categoryId, isActive: true })
        .populate("category", "name slug")
        .lean()
        .skip(skip)
        .limit(parseInt(limit))
        .maxTimeMS(3000),
      Product.countDocuments({ category: categoryId, isActive: true })
    ]);

    const response = {
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: products,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=120');

    res.status(200).json(response);
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get featured products (OPTIMIZED)
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const cacheKey = getCacheKey('featured_products', { limit });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const products = await Product.find({
      isFeatured: true,
      isActive: true,
    })
      .populate("category", "name slug")
      .lean()
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .maxTimeMS(3000);

    const response = {
      success: true,
      count: products.length,
      data: products,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=300');

    res.status(200).json(response);
  } catch (error) {
    console.error("Get featured products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Search products (OPTIMIZED)
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const cacheKey = getCacheKey('search_products', { q, page, limit });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Optimized search using regex (add text index in MongoDB for better performance)
    const searchFilter = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
      ],
      isActive: true,
    };

    const [products, total] = await Promise.all([
      Product.find(searchFilter)
        .populate("category", "name slug")
        .lean()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .maxTimeMS(5000),
      Product.countDocuments(searchFilter)
    ]);

    const response = {
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: products,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=60'); // Shorter cache for search

    res.status(200).json(response);
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get products by offer type (OPTIMIZED)
// @route   GET /api/products/offers/:type
// @access  Public
const getProductsByOfferType = async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10 } = req.query;

    const validTypes = ["hot-deal", "best-deal", "special-offer", "flash-sale", "featured"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer type",
      });
    }

    const cacheKey = getCacheKey('products_by_offer', { type, limit });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const products = await Product.find({
      offerType: type,
      isActive: true,
    })
      .sort({ offerPriority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate("category", "name slug")
      .lean()
      .maxTimeMS(3000);

    const response = {
      success: true,
      count: products.length,
      data: products,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=120');

    res.status(200).json(response);
  } catch (error) {
    console.error("Get products by offer type error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all active offers (OPTIMIZED)
// @route   GET /api/products/offers
// @access  Public
const getAllOffers = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const cacheKey = getCacheKey('all_offers', { limit });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const products = await Product.find({
      offerType: { $ne: "none" },
      isActive: true,
    })
      .sort({ offerPriority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate("category", "name slug")
      .lean()
      .maxTimeMS(3000);

    const response = {
      success: true,
      count: products.length,
      data: products,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=120');

    res.status(200).json(response);
  } catch (error) {
    console.error("Get all offers error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get related products (OPTIMIZED)
// @route   GET /api/products/:id/related
// @access  Public
const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;
    
    const cacheKey = getCacheKey('related_products', { id, limit });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const related = await Product.find({
      category: product.category,
      _id: { $ne: id },
      isActive: true,
    })
      .limit(parseInt(limit))
      .populate("category", "name slug")
      .lean()
      .sort({ createdAt: -1 })
      .maxTimeMS(3000);

    const response = {
      success: true,
      count: related.length,
      data: related,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=300');

    res.status(200).json(response);
  } catch (error) {
    console.error("Get related products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get flash sale products (OPTIMIZED)
// @route   GET /api/products/flash-sale
// @access  Public
const getFlashSaleProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const cacheKey = getCacheKey('flash_sale', { limit });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const products = await Product.find({
      offerType: "flash-sale",
      isActive: true,
      flashSaleQuantity: { $gt: 0 },
    })
      .sort({ offerPriority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate("category", "name slug")
      .lean()
      .maxTimeMS(3000);

    const response = {
      success: true,
      count: products.length,
      data: products,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=60'); // Shorter cache for flash sales

    res.status(200).json(response);
  } catch (error) {
    console.error("Get flash sale products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get latest products (OPTIMIZED)
// @route   GET /api/products/latest
// @access  Public
const getLatestProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const cacheKey = getCacheKey('latest_products', { limit });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("category", "name slug")
      .lean()
      .maxTimeMS(3000);

    const response = {
      success: true,
      count: products.length,
      data: products,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=120');

    res.status(200).json(response);
  } catch (error) {
    console.error("Get latest products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get products by price range (OPTIMIZED)
// @route   GET /api/products/price-range
// @access  Public
const getProductsByPriceRange = async (req, res) => {
  try {
    const { min = 0, max = Infinity, limit = 20 } = req.query;
    const cacheKey = getCacheKey('price_range', { min, max, limit });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const products = await Product.find({
      price: { $gte: Number(min), $lte: Number(max) },
      isActive: true,
    })
      .sort({ price: 1 })
      .limit(parseInt(limit))
      .populate("category", "name slug")
      .lean()
      .maxTimeMS(3000);

    const response = {
      success: true,
      count: products.length,
      data: products,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=120');

    res.status(200).json(response);
  } catch (error) {
    console.error("Get products by price range error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update flash sale sold count
// @route   PATCH /api/products/:id/flash-sale
// @access  Private/Admin
const updateFlashSaleSold = async (req, res) => {
  try {
    const { quantity = 1 } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.offerType !== "flash-sale") {
      return res.status(400).json({
        success: false,
        message: "Product is not a flash sale item",
      });
    }

    if (product.flashSaleSold + quantity > product.flashSaleQuantity) {
      return res.status(400).json({
        success: false,
        message: "Not enough flash sale quantity available",
      });
    }

    product.flashSaleSold += quantity;
    product.stock -= quantity;
    await product.save();

    // Clear caches
    clearProductCaches();

    res.status(200).json({
      success: true,
      message: "Flash sale updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update flash sale error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============= BRAND-SPECIFIC FUNCTIONS (OPTIMIZED) =============

// @desc    Get all unique brands (OPTIMIZED)
// @route   GET /api/products/brands
// @access  Public
const getAllBrands = async (req, res) => {
  try {
    const cacheKey = 'all_brands';
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const brands = await Product.distinct("brand", { isActive: true });
    
    // Use aggregation for better performance
    const brandsWithCount = await Product.aggregate([
      { $match: { isActive: true, brand: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: "$brand",
          count: { $sum: 1 },
          image: { $first: { $ifNull: ["$mainImage", { $arrayElemAt: ["$images", 0] }] } }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          name: "$_id",
          _id: 0,
          count: 1,
          image: 1
        }
      }
    ]);

    const response = {
      success: true,
      count: brands.length,
      data: brandsWithCount,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=600'); // Longer cache for brands

    res.status(200).json(response);
  } catch (error) {
    console.error("Get all brands error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get products by brand (OPTIMIZED)
// @route   GET /api/products/brand/:brand
// @access  Public
const getProductsByBrand = async (req, res) => {
  try {
    const { brand } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      minPrice,
      maxPrice,
      category,
    } = req.query;

    const cacheKey = getCacheKey('products_by_brand', req.params, req.query);
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    // Build filter
    const filter = {
      brand: { $regex: new RegExp(`^${brand}$`, "i") },
      isActive: true,
    };

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const [products, total, categories] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .lean()
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .maxTimeMS(5000),
      Product.countDocuments(filter),
      Product.distinct("category", filter)
    ]);

    const populatedCategories = await Category.find({
      _id: { $in: categories },
    }).select("name slug").lean();

    const response = {
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      brand: brand,
      filters: { categories: populatedCategories },
      data: products,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=120');

    res.status(200).json(response);
  } catch (error) {
    console.error("Get products by brand error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get brand details (OPTIMIZED)
// @route   GET /api/products/brand/:brand/details
// @access  Public
const getBrandDetails = async (req, res) => {
  try {
    const { brand } = req.params;
    const cacheKey = getCacheKey('brand_details', { brand });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const matchStage = {
      brand: { $regex: new RegExp(`^${brand}$`, "i") },
      isActive: true
    };

    const [products, stats] = await Promise.all([
      Product.find(matchStage)
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .limit(1)
        .lean(),
      Product.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            avgPrice: { $avg: "$price" },
            categories: { $addToSet: "$category" }
          }
        }
      ])
    ]);

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const response = {
      success: true,
      data: {
        name: brand,
        totalProducts: stats[0]?.totalProducts || 0,
        averagePrice: stats[0]?.avgPrice || 0,
        totalCategories: stats[0]?.categories?.length || 0,
        sampleProduct: products[0],
      },
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=300');

    res.status(200).json(response);
  } catch (error) {
    console.error("Get brand details error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get popular brands (OPTIMIZED)
// @route   GET /api/products/brands/popular
// @access  Public
const getPopularBrands = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const cacheKey = getCacheKey('popular_brands', { limit });
    
    let cachedData = productCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ ...cachedData, cached: true });
    }

    const brands = await Product.aggregate([
      { $match: { isActive: true, brand: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: "$brand",
          count: { $sum: 1 },
          averagePrice: { $avg: "$price" },
          image: { $first: { $ifNull: ["$mainImage", { $arrayElemAt: ["$images", 0] }] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          name: "$_id",
          _id: 0,
          count: 1,
          averagePrice: 1,
          image: 1
        }
      }
    ]);

    const response = {
      success: true,
      count: brands.length,
      data: brands,
    };

    productCache.set(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=600');

    res.status(200).json(response);
  } catch (error) {
    console.error("Get popular brands error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Clear product cache (admin utility)
// @route   POST /api/products/clear-cache
// @access  Private/Admin
const clearProductCache = async (req, res) => {
  try {
    clearProductCaches();
    res.status(200).json({
      success: true,
      message: 'Product cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get cache stats (admin utility)
// @route   GET /api/products/cache-stats
// @access  Private/Admin
const getProductCacheStats = async (req, res) => {
  try {
    const stats = productCache.getStats();
    const keys = productCache.keys();
    
    res.status(200).json({
      success: true,
      data: {
        hits: stats.hits,
        misses: stats.misses,
        keys: keys.length,
        keysList: keys.slice(0, 20), // Show first 20 keys
        ksize: stats.ksize,
        vsize: stats.vsize
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getFeaturedProducts,
  searchProducts,
  getProductsByOfferType,
  getAllOffers,
  getRelatedProducts,
  getFlashSaleProducts,
  getLatestProducts,
  getProductsByPriceRange,
  updateFlashSaleSold,
  getAllBrands,
  getProductsByBrand,
  getBrandDetails,
  getPopularBrands,
  clearProductCache,
  getProductCacheStats,
};