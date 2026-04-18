// controllers/category.controller.js
const Category = require("../models/Category");
const NodeCache = require('node-cache');

// Initialize cache with 5 minutes TTL
const categoryCache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Better performance
});

// Helper function to validate and process Base64 image
const processBase64Image = (base64String) => {
  if (!base64String) return null;
  
  const base64Regex = /^data:image\/(jpeg|jpg|png|webp|gif|bmp);base64,/;
  
  if (base64Regex.test(base64String)) {
    const base64Data = base64String.split(',')[1];
    const base64Size = Buffer.from(base64Data, 'base64').length;
    if (base64Size > 2 * 1024 * 1024) {
      throw new Error('Image size must be less than 2MB');
    }
    return base64String;
  }
  
  if (base64String && (base64String.startsWith('http') || base64String.startsWith('/uploads'))) {
    return base64String;
  }
  
  return null;
};

// Helper function to generate cache key
const getCacheKey = (prefix, params = {}) => {
  return `${prefix}_${JSON.stringify(params)}`;
};

// OPTIMIZED: Get all categories with caching
const getCategories = async (req, res) => {
  try {
    const cacheKey = 'all_categories';
    
    // Check cache first
    let cachedData = categoryCache.get(cacheKey);
    if (cachedData) {
      console.log('✅ Returning cached categories');
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'public, max-age=300');
      return res.status(200).json({
        success: true,
        count: cachedData.length,
        data: cachedData,
        cached: true
      });
    }
    
    console.log('📡 Fetching categories from database...');
    
    // Optimized query - select only needed fields, use lean() for better performance
    const categories = await Category.find(
      // { isActive: true },
      {},
      '_id name description image parent level order slug imageAlt icon'
    )
    .lean() // Returns plain JavaScript objects, not Mongoose documents
    .sort({ level: 1, order: 1, name: 1 })
    .maxTimeMS(5000); // 5 second timeout
    
    if (!categories || categories.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // Store in cache
    categoryCache.set(cacheKey, categories);
    console.log(`✅ Cached ${categories.length} categories`);
    
    // Set cache headers for CDN/browser
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.set('X-Cache', 'MISS');
    res.set('X-Response-Time', Date.now());
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error('Error in getCategories:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// OPTIMIZED: Get category tree with single query and in-memory tree building
const getCategoryTree = async (req, res) => {
  try {
    const cacheKey = 'category_tree';
    
    // Check cache
    let cachedData = categoryCache.get(cacheKey);
    if (cachedData) {
      console.log('✅ Returning cached category tree');
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'public, max-age=600');
      return res.status(200).json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    console.log('🌲 Building category tree from database...');
    
    // Get ALL active categories in a single query (no N+1 problem)
    const allCategories = await Category.find(
      // { isActive: true }, 
      {},
      '_id name slug description image imageAlt icon level order parent'
    )
    .lean()
    .sort({ order: 1, name: 1 })
    .maxTimeMS(5000);
    
    if (!allCategories || allCategories.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    // Build tree in memory - O(n) complexity
    const categoryMap = new Map();
    const roots = [];
    
    // First pass: create map of all categories
    allCategories.forEach(cat => {
      categoryMap.set(cat._id.toString(), { 
        ...cat, 
        subcategories: [],
        children: [] // Alias for subcategories
      });
    });
    
    // Second pass: build hierarchy
    allCategories.forEach(cat => {
      const node = categoryMap.get(cat._id.toString());
      if (cat.parent && categoryMap.has(cat.parent.toString())) {
        const parent = categoryMap.get(cat.parent.toString());
        parent.subcategories.push(node);
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });
    
    // Sort subcategories by order and name
    const sortSubcategories = (items) => {
      items.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      });
      items.forEach(item => {
        if (item.subcategories && item.subcategories.length > 0) {
          sortSubcategories(item.subcategories);
        }
      });
    };
    
    sortSubcategories(roots);
    
    // Cache the result
    categoryCache.set(cacheKey, roots);
    console.log(`✅ Cached category tree with ${roots.length} root categories`);
    
    // Set cache headers (longer TTL for tree)
    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=120');
    res.set('X-Cache', 'MISS');
    
    res.status(200).json({
      success: true,
      data: roots,
    });
  } catch (error) {
    console.error('Error in getCategoryTree:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// OPTIMIZED: Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = getCacheKey('category', { id });
    
    // Check cache
    let cachedData = categoryCache.get(cacheKey);
    if (cachedData) {
      res.set('X-Cache', 'HIT');
      return res.status(200).json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    const category = await Category.findById(id)
      .select('_id name slug description image imageAlt icon parent level order isActive metaTitle metaDescription')
      .lean()
      .maxTimeMS(3000);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    
    // Get subcategories if needed
    const subcategories = await Category.find(
      { parent: id, isActive: true },
      '_id name slug description image level order'
    )
    .lean()
    .sort({ order: 1, name: 1 });
    
    const result = {
      ...category,
      subcategories
    };
    
    categoryCache.set(cacheKey, result);
    res.set('Cache-Control', 'public, max-age=300');
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in getCategoryById:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// OPTIMIZED: Get category by slug
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = getCacheKey('category_slug', { slug });
    
    // Check cache
    let cachedData = categoryCache.get(cacheKey);
    if (cachedData) {
      res.set('X-Cache', 'HIT');
      return res.status(200).json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    // Try to find by slug first
    let category = await Category.findOne({ slug, isActive: true })
      .select('_id name slug description image imageAlt icon parent level order metaTitle metaDescription')
      .lean()
      .maxTimeMS(3000);
    
    // If not found by slug, try by name (backward compatibility)
    if (!category) {
      const decodedSlug = decodeURIComponent(slug).replace(/-/g, " ");
      category = await Category.findOne({
        name: { $regex: new RegExp(`^${decodedSlug}$`, "i") },
        isActive: true
      })
      .select('_id name slug description image imageAlt icon parent level order metaTitle metaDescription')
      .lean();
    }
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    
    // Get subcategories
    const subcategories = await Category.find({ 
      parent: category._id, 
      isActive: true 
    })
    .select('_id name slug description image icon level order')
    .lean()
    .sort({ order: 1, name: 1 });
    
    const result = {
      ...category,
      subcategories,
    };
    
    categoryCache.set(cacheKey, result);
    res.set('Cache-Control', 'public, max-age=300');
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in getCategoryBySlug:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// OPTIMIZED: Get subcategories with parallel queries
const getSubcategories = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = getCacheKey('subcategories', { id });
    
    // Check cache
    let cachedData = categoryCache.get(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData.subcategories,
        count: cachedData.count,
        parentCategory: cachedData.parentCategory,
        cached: true
      });
    }
    
    // Run queries in parallel for better performance
    const [category, subcategories] = await Promise.all([
      Category.findById(id)
        .select('_id name slug description image')
        .lean()
        .maxTimeMS(3000),
      Category.find({ parent: id, isActive: true })
        .select('_id name slug description image level order')
        .lean()
        .sort({ order: 1, name: 1 })
        .maxTimeMS(3000)
    ]);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    
    const result = {
      subcategories,
      count: subcategories.length,
      parentCategory: {
        id: category._id,
        name: category.name,
        slug: category.slug,
      }
    };
    
    categoryCache.set(cacheKey, result);
    
    res.json({
      success: true,
      data: subcategories,
      count: subcategories.length,
      parentCategory: result.parentCategory,
    });
  } catch (error) {
    console.error("Error in getSubcategories:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// OPTIMIZED: Get subcategory by slugs
const getSubcategoryBySlug = async (req, res) => {
  try {
    const { categorySlug, subcategorySlug } = req.params;
    const cacheKey = getCacheKey('subcategory_slug', { categorySlug, subcategorySlug });
    
    // Check cache
    let cachedData = categoryCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    // Find parent category
    let parentCategory = await Category.findOne({ slug: categorySlug, isActive: true })
      .select('_id name slug')
      .lean();
      
    if (!parentCategory) {
      const decodedSlug = decodeURIComponent(categorySlug).replace(/-/g, " ");
      parentCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${decodedSlug}$`, "i") },
        isActive: true
      })
      .select('_id name slug')
      .lean();
    }
    
    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    
    // Find subcategory
    let subcategory = await Category.findOne({
      slug: subcategorySlug,
      parent: parentCategory._id,
      isActive: true
    })
    .select('_id name slug description image imageAlt icon level order metaTitle metaDescription')
    .lean();
    
    if (!subcategory) {
      const decodedSlug = decodeURIComponent(subcategorySlug).replace(/-/g, " ");
      subcategory = await Category.findOne({
        name: { $regex: new RegExp(`^${decodedSlug}$`, "i") },
        parent: parentCategory._id,
        isActive: true
      })
      .select('_id name slug description image imageAlt icon level order metaTitle metaDescription')
      .lean();
    }
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }
    
    // Get products for this subcategory
    const Product = require("../models/Product");
    const products = await Product.find({
      category: subcategory._id,
      isActive: true,
    })
    .select('_id name price discountPrice originalPrice images mainImage rating inStock stock slug')
    .lean()
    .limit(50) // Limit products for performance
    .maxTimeMS(3000);
    
    const result = {
      ...subcategory,
      parentCategory: {
        _id: parentCategory._id,
        name: parentCategory.name,
        slug: parentCategory.slug,
      },
      products,
      productsCount: products.length
    };
    
    categoryCache.set(cacheKey, result);
    res.set('Cache-Control', 'public, max-age=120');
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getSubcategoryBySlug:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// OPTIMIZED: Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = getCacheKey('category_products', { id });
    
    // Check cache
    let cachedData = categoryCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        ...cachedData,
        cached: true
      });
    }
    
    // Get category and products in parallel
    const [category, products] = await Promise.all([
      Category.findById(id)
        .select('_id name slug description image')
        .lean()
        .maxTimeMS(3000),
      require("../models/Product").find({
        category: id,
        isActive: true,
      })
      .select('_id name price discountPrice originalPrice images mainImage rating inStock stock slug')
      .lean()
      .limit(50)
      .maxTimeMS(3000)
    ]);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    
    const result = {
      count: products.length,
      data: products,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
      }
    };
    
    categoryCache.set(cacheKey, result);
    res.set('Cache-Control', 'public, max-age=120');
    
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getProductsByCategory:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create category (no caching)
const createCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      imageAlt,
      bannerImage,
      icon,
      parent,
      metaTitle,
      metaDescription,
      order,
      featured,
    } = req.body;
    
    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    
    // Calculate level based on parent
    let level = 0;
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (parentCategory) {
        level = parentCategory.level + 1;
      }
    }
    
    // Process Base64 images
    let processedImage = null;
    let processedBannerImage = null;
    
    try {
      processedImage = processBase64Image(image);
      processedBannerImage = processBase64Image(bannerImage);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    const category = await Category.create({
      name,
      slug,
      description: description || "",
      image: processedImage,
      imageAlt: imageAlt || "",
      bannerImage: processedBannerImage,
      icon: icon || null,
      parent: parent || null,
      level,
      metaTitle: metaTitle || name,
      metaDescription: metaDescription || description || "",
      order: order || 0,
      featured: featured || false,
    });
    
    // Clear all caches after creating new category
    categoryCache.flushAll();
    console.log('🗑️ Cache cleared after category creation');
    
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update category (clear cache)
const updateCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      imageAlt,
      bannerImage,
      icon,
      parent,
      metaTitle,
      metaDescription,
      order,
      featured,
      isActive,
    } = req.body;
    
    const updateData = {
      description: description || "",
      imageAlt: imageAlt || "",
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
    };
    
    // Process Base64 images if provided
    if (image !== undefined) {
      try {
        updateData.image = processBase64Image(image);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }
    
    if (bannerImage !== undefined) {
      try {
        updateData.bannerImage = processBase64Image(bannerImage);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }
    
    if (icon !== undefined) {
      updateData.icon = icon || null;
    }
    
    if (name) {
      updateData.name = name;
      updateData.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    
    if (parent !== undefined) {
      if (parent && parent !== "") {
        const parentCategory = await Category.findById(parent);
        if (parentCategory) {
          updateData.level = parentCategory.level + 1;
          updateData.parent = parent;
        } else if (parent === null || parent === "") {
          updateData.level = 0;
          updateData.parent = null;
        }
      } else {
        updateData.level = 0;
        updateData.parent = null;
      }
    }
    
    if (order !== undefined) updateData.order = order;
    if (featured !== undefined) updateData.featured = featured;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("parent", "name slug image");
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    
    // Clear all caches after update
    categoryCache.flushAll();
    console.log('🗑️ Cache cleared after category update');
    
    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete category (clear cache)
const deleteCategory = async (req, res) => {
  try {
    const hasChildren = await Category.findOne({ parent: req.params.id });
    
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with subcategories",
      });
    }
    
    const category = await Category.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    
    // Clear all caches after deletion
    categoryCache.flushAll();
    console.log('🗑️ Cache cleared after category deletion');
    
    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Clear all cache (admin utility)
const clearCategoryCache = async (req, res) => {
  try {
    categoryCache.flushAll();
    console.log('🗑️ Category cache cleared manually');
    res.status(200).json({
      success: true,
      message: 'Category cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get cache stats (admin utility)
const getCacheStats = async (req, res) => {
  try {
    const stats = categoryCache.getStats();
    const keys = categoryCache.keys();
    
    res.status(200).json({
      success: true,
      data: {
        hits: stats.hits,
        misses: stats.misses,
        keys: keys.length,
        keysList: keys,
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
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getSubcategories,
  getSubcategoryBySlug,
  getProductsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  clearCategoryCache,
  getCacheStats,
};