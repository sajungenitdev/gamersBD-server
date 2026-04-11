const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ====================================
  // BASIC INFORMATION
  // ====================================
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  
  // ====================================
  // PERSONAL INFORMATION
  // ====================================
  firstName: {
    type: String,
    default: '',
    trim: true
  },
  lastName: {
    type: String,
    default: '',
    trim: true
  },
  phone: {
    type: String,
    default: '',
    match: [/^(\+)?[0-9\s\-\(\)]{10,15}$/, 'Please add a valid phone number']
  },
  bio: {
    type: String,
    default: '',
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },
  
  // ====================================
  // AVATAR (Base64)
  // ====================================
  avatar: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^data:image\/(jpeg|png|jpg|gif|webp);base64,/.test(v);
      },
      message: 'Avatar must be a valid base64 encoded image'
    }
  },
  
  // ====================================
  // ACCOUNT SETTINGS
  // ====================================
  role: {
    type: String,
    enum: ['user', 'admin', 'editor', 'moderator'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'banned'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  
  // ====================================
  // ADDRESS INFORMATION
  // ====================================
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'Bangladesh' },
    isDefault: { type: Boolean, default: false }
  },
  
  // Multiple Addresses
  addresses: [{
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'Bangladesh' },
    isDefault: { type: Boolean, default: false },
    label: { type: String, default: 'Home' },
    phone: { type: String, default: '' },
    fullName: { type: String, default: '' }
  }],
  
  // ====================================
  // SOCIAL MEDIA LINKS
  // ====================================
  social: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    discord: { type: String, default: '' },
    twitch: { type: String, default: '' },
    youtube: { type: String, default: '' },
    tiktok: { type: String, default: '' }
  },
  
  // ====================================
  // GAMING PREFERENCES
  // ====================================
  gaming: {
    favoritePlatforms: [{
      type: String,
      enum: ['PS5', 'PS4', 'Xbox Series X', 'Xbox One', 'PC', 'Nintendo Switch', 'Mobile', 'VR']
    }],
    favoriteGenres: [{
      type: String,
      enum: ['Action', 'Adventure', 'RPG', 'Shooter', 'Strategy', 'Sports', 'Racing', 'Horror', 'Fighting', 'Simulation', 'Battle Royale', 'MOBA']
    }],
    gamerTag: { type: String, default: '' },
    steamId: { type: String, default: '' },
    epicId: { type: String, default: '' },
    xboxGamertag: { type: String, default: '' },
    psnId: { type: String, default: '' },
    nintendoFriendCode: { type: String, default: '' },
    riotId: { type: String, default: '' },
    battleNetId: { type: String, default: '' }
  },
  
  // ====================================
  // USER PREFERENCES
  // ====================================
  preferences: {
    newsletter: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'BDT' },
    timezone: { type: String, default: 'Asia/Dhaka' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' }
  },
  
  // ====================================
  // STATISTICS
  // ====================================
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    reviewsWritten: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },
    compareCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    loginCount: { type: Number, default: 0 },
    accountAge: { type: Number, default: 0 } // in days
  },
  
  // ====================================
  // WISHLIST & COMPARE
  // ====================================
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  
  compareList: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  
  // ====================================
  // RECENTLY VIEWED PRODUCTS
  // ====================================
  recentlyViewed: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // ====================================
  // CART REFERENCE (One-to-One)
  // ====================================
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cart'
  },
  
  // ====================================
  // SECURITY
  // ====================================
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  sessionTokens: [{
    token: { type: String },
    device: { type: String, default: 'Unknown' },
    browser: { type: String, default: 'Unknown' },
    ip: { type: String, default: 'Unknown' },
    location: { type: String, default: 'Unknown' },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // ====================================
  // ACCOUNT MANAGEMENT
  // ====================================
  deletionRequested: {
    type: Boolean,
    default: false
  },
  deletionScheduledAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  
  // ====================================
  // REFERRAL SYSTEM
  // ====================================
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referralEarnings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ====================================
// INDEXES FOR PERFORMANCE
// ====================================
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'gaming.gamerTag': 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.totalSpent': -1 });

// ====================================
// VIRTUALS
// ====================================
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim() || this.name;
});

userSchema.virtual('initials').get(function() {
  return this.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
});

userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

userSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// ====================================
// PRE-SAVE MIDDLEWARE - Hash password
// ====================================
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified (or new)
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ====================================
// PRE-SAVE - Update name from firstName/lastName
// ====================================
userSchema.pre('save', function(next) {
  if (this.firstName || this.lastName) {
    const firstName = this.firstName || '';
    const lastName = this.lastName || '';
    this.name = `${firstName} ${lastName}`.trim();
  }
  next();
});

// ====================================
// PRE-SAVE - Generate referral code
// ====================================
userSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    this.referralCode = 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

// ====================================
// METHODS
// ====================================

// Compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update login stats
userSchema.methods.updateLoginStats = async function(deviceInfo = {}) {
  this.stats.lastLoginAt = new Date();
  this.stats.loginCount += 1;
  
  if (deviceInfo.token) {
    this.sessionTokens.push({
      token: deviceInfo.token,
      device: deviceInfo.device || 'Unknown',
      browser: deviceInfo.browser || 'Unknown',
      ip: deviceInfo.ip || 'Unknown',
      location: deviceInfo.location || 'Unknown'
    });
    
    // Keep only last 10 sessions
    if (this.sessionTokens.length > 10) {
      this.sessionTokens = this.sessionTokens.slice(-10);
    }
  }
  
  await this.save();
};

// Add to recently viewed
userSchema.methods.addToRecentlyViewed = async function(productId) {
  // Remove if already exists
  this.recentlyViewed = this.recentlyViewed.filter(
    item => item.product.toString() !== productId.toString()
  );
  
  // Add to beginning
  this.recentlyViewed.unshift({ product: productId, viewedAt: new Date() });
  
  // Keep only last 20
  if (this.recentlyViewed.length > 20) {
    this.recentlyViewed = this.recentlyViewed.slice(0, 20);
  }
  
  await this.save();
};

// Add to wishlist
userSchema.methods.addToWishlist = async function(productId) {
  if (!this.wishlist.includes(productId)) {
    this.wishlist.push(productId);
    this.stats.wishlistCount = this.wishlist.length;
    await this.save();
  }
  return this.wishlist;
};

// Remove from wishlist
userSchema.methods.removeFromWishlist = async function(productId) {
  this.wishlist = this.wishlist.filter(
    id => id.toString() !== productId.toString()
  );
  this.stats.wishlistCount = this.wishlist.length;
  await this.save();
  return this.wishlist;
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = token;
  this.passwordResetExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
  return token;
};

// Add referral earnings
userSchema.methods.addReferralEarnings = async function(amount) {
  this.referralEarnings += amount;
  await this.save();
};

// ====================================
// STATIC METHODS
// ====================================

// Find active users
userSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Get user statistics
userSchema.statics.getStats = async function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return {
    total: await this.countDocuments(),
    active: await this.countDocuments({ status: 'active' }),
    admins: await this.countDocuments({ role: 'admin' }),
    users: await this.countDocuments({ role: 'user' }),
    verified: await this.countDocuments({ emailVerified: true }),
    newToday: await this.countDocuments({
      createdAt: { $gte: today }
    }),
    totalSpent: await this.aggregate([
      { $group: { _id: null, total: { $sum: '$stats.totalSpent' } } }
    ]).then(res => res[0]?.total || 0)
  };
};

// Get top users by spending
userSchema.statics.getTopSpenders = async function(limit = 10) {
  return this.find({ 'stats.totalSpent': { $gt: 0 } })
    .sort({ 'stats.totalSpent': -1 })
    .limit(limit)
    .select('name email stats.totalSpent avatar');
};

// ====================================
// HELPER FUNCTIONS
// ====================================
const imageToBase64 = (imageBuffer, mimeType) => {
  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
};

const isValidBase64Image = (base64String) => {
  if (!base64String) return true;
  return /^data:image\/(jpeg|png|jpg|gif|webp);base64,/.test(base64String);
};

module.exports = mongoose.model('User', userSchema);