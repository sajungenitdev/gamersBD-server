const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price cannot be negative"],
      validate: {
        validator: function (value) {
          return !value || value < this.price;
        },
        message: "Discount price must be less than regular price",
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    images: [
      {
        type: String, // base64 images
        required: [true, "At least one image is required"],
      },
    ],
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    // Game/Toys specific fields
    type: {
      type: String,
      enum: ["game", "toy", "accessory", "console", "board-game", "card-game"],
      required: true,
    },
    platform: {
      type: [String], // For games: ['PS5', 'Xbox', 'Nintendo Switch', 'PC', 'Mobile']
      default: [],
    },
    genre: {
      type: [String], // ['Action', 'Adventure', 'RPG', 'Strategy', 'Racing', 'Sports']
      default: [],
    },
    ageRange: {
      min: { type: Number, default: 3 },
      max: { type: Number, default: 99 },
    },
    players: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 4 },
    },
    brand: String,
    publisher: String,
    releaseDate: Date,

    // Product details
    features: [String],
    specifications: Map,
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: "cm" },
    },

    // Ratings and reviews
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },

    // Metadata
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [String],

    // SEO
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for reviews
productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
});

// Create slug before save
productSchema.pre("save", function (next) {
  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  next();
});

// Index for search
productSchema.index({ name: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Product", productSchema);
