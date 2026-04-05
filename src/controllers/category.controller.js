// controllers/category.controller.js
const Category = require("../models/Category");

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate("parent", "name slug");
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate(
      "parent",
      "name slug",
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get category by slug
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // First try to find by slug
    let category = await Category.findOne({ slug }).populate("parent", "name slug");
    
    // If not found by slug, try to find by name (for backward compatibility)
    if (!category) {
      const decodedSlug = decodeURIComponent(slug).replace(/-/g, ' ');
      category = await Category.findOne({ 
        name: { $regex: new RegExp(`^${decodedSlug}$`, 'i') } 
      }).populate("parent", "name slug");
    }
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get subcategories
    const subcategories = await Category.find({ parent: category._id })
      .select('_id name slug description image level');
    
    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        subcategories
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get subcategories of a category
const getSubcategories = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Getting subcategories for category ID:', id);
    
    // Find category by ID
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Get subcategories (categories that have this category as parent)
    const subcategories = await Category.find({ 
      parent: id
    }).select('_id name slug description image level');
    
    console.log(`Found ${subcategories.length} subcategories`);
    
    res.json({
      success: true,
      data: subcategories,
      count: subcategories.length,
      parentCategory: {
        id: category._id,
        name: category.name,
        slug: category.slug
      }
    });
    
  } catch (error) {
    console.error('Error in getSubcategories:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get subcategory by slugs
const getSubcategoryBySlug = async (req, res) => {
  try {
    const { categorySlug, subcategorySlug } = req.params;
    
    console.log('Looking for subcategory:', { categorySlug, subcategorySlug });
    
    // First find the parent category
    let parentCategory = await Category.findOne({ slug: categorySlug });
    if (!parentCategory) {
      const decodedSlug = decodeURIComponent(categorySlug).replace(/-/g, ' ');
      parentCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${decodedSlug}$`, 'i') } 
      });
    }
    
    if (!parentCategory) {
      console.log('Parent category not found:', categorySlug);
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    
    // Find subcategory by slug that has parent = parentCategory._id
    let subcategory = await Category.findOne({ 
      slug: subcategorySlug,
      parent: parentCategory._id
    }).populate('parent', 'name slug');
    
    if (!subcategory) {
      // Try to find by name
      const decodedSlug = decodeURIComponent(subcategorySlug).replace(/-/g, ' ');
      subcategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${decodedSlug}$`, 'i') },
        parent: parentCategory._id
      }).populate('parent', 'name slug');
    }
    
    if (!subcategory) {
      console.log('Subcategory not found:', subcategorySlug);
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }
    
    console.log('Found subcategory:', subcategory.name);
    
    // Get products for this subcategory
    const Product = require("../models/Product");
    const products = await Product.find({ 
      category: subcategory._id,
      isActive: true 
    }).select('_id name price discountPrice originalPrice images mainImage rating inStock stock slug');
    
    res.status(200).json({
      success: true,
      data: {
        ...subcategory.toObject(),
        parentCategory: {
          _id: parentCategory._id,
          name: parentCategory.name,
          slug: parentCategory.slug
        },
        products
      },
    });
  } catch (error) {
    console.error('Error in getSubcategoryBySlug:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get products by category ID (for categories without subcategories)
const getProductsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Getting products for category:', id);
    
    // Check if category exists
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    
    // Import Product model
    const Product = require("../models/Product");
    
    // Find products that belong to this category
    const products = await Product.find({ 
      category: id,
      isActive: true 
    }).select('_id name price discountPrice originalPrice images mainImage rating inStock stock slug');
    
    console.log(`Found ${products.length} products for category ${category.name}`);
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug
      }
    });
    
  } catch (error) {
    console.error('Error in getProductsByCategory:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, description, image, parent } = req.body;

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

    const category = await Category.create({
      name,
      slug,
      description,
      image,
      parent: parent || null,
      level,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { name, description, image, parent } = req.body;
    
    const updateData = {
      description,
      image,
    };
    
    if (name) {
      updateData.name = name;
      updateData.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (parent !== undefined) {
      if (parent && parent !== '') {
        const parentCategory = await Category.findById(parent);
        if (parentCategory) {
          updateData.level = parentCategory.level + 1;
          updateData.parent = parent;
        } else if (parent === null || parent === '') {
          updateData.level = 0;
          updateData.parent = null;
        }
      } else {
        updateData.level = 0;
        updateData.parent = null;
      }
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('parent', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete category
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

// Get category tree (all categories with their subcategories)
const getCategoryTree = async (req, res) => {
  try {
    // Get all top-level categories (parent = null)
    const topLevelCategories = await Category.find({ parent: null })
      .select('_id name slug description image level');
    
    // For each top-level category, get its subcategories
    const categoryTree = await Promise.all(
      topLevelCategories.map(async (category) => {
        const subcategories = await Category.find({ parent: category._id })
          .select('_id name slug description image level');
        return {
          ...category.toObject(),
          subcategories
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: categoryTree,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getSubcategories,
  getSubcategoryBySlug,
  getProductsByCategory,  // Fixed: Changed from getProductsBySubcategory
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
};