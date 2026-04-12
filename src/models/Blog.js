const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      required: [true, "Excerpt is required"],
      trim: true,
      maxlength: [200, "Excerpt cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    image: {
      type: String,
      required: [true, "Image is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Gaming News",
        "Reviews",
        "Guides",
        "Features",
        "Esports",
        "Wellness",
        "Interviews",
      ],
    },
    author: {
      name: {
        type: String,
        required: true,
      },
      avatar: {
        type: String,
        default: null,
      },
      role: {
        type: String,
        default: "Contributor",
      },
      email: {
        type: String,
        required: true,
      },
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        user: {
          name: String,
          email: String,
          avatar: String,
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    commentCount: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Create slug from title before saving
blogSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

// Update comment count when comments are modified
blogSchema.pre("save", function (next) {
  if (this.isModified("comments")) {
    this.commentCount = this.comments.length;
  }
  // next();
});

// Indexes for search
blogSchema.index({ title: "text", content: "text", tags: "text" });
blogSchema.index({ category: 1, publishedAt: -1 });
blogSchema.index({ featured: 1, isPublished: 1 });

module.exports = mongoose.model("Blog", blogSchema);