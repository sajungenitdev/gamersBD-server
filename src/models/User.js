const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC INFO
    // =========================
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Invalid email'
      ]
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },

    // =========================
    // PERSONAL INFO
    // =========================
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    dateOfBirth: { type: Date, default: null },

    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say'
    },

    // =========================
    // AVATAR (BASE64 URL)
    // =========================
    avatar: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^data:image\/(png|jpg|jpeg|webp|gif);base64,/.test(v);
        },
        message: 'Avatar must be valid Base64 image string'
      }
    },

    // =========================
    // ACCOUNT
    // =========================
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

    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    passwordResetToken: String,
    passwordResetExpires: Date,

    // =========================
    // ADDRESS
    // =========================
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'Bangladesh' }
    },

    addresses: [
      {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: { type: String, default: 'Bangladesh' },
        label: { type: String, default: 'Home' },
        phone: String,
        fullName: String
      }
    ],

    // =========================
    // SOCIAL
    // =========================
    social: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
      youtube: String,
      discord: String
    },

    // =========================
    // GAMING
    // =========================
    gaming: {
      favoritePlatforms: [String],
      favoriteGenres: [String],
      gamerTag: String,
      steamId: String,
      psnId: String,
      xboxGamertag: String
    },

    // =========================
    // PREFERENCES
    // =========================
    preferences: {
      newsletter: { type: Boolean, default: false },
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'BDT' },
      timezone: { type: String, default: 'Asia/Dhaka' },
      theme: { type: String, default: 'dark' }
    },

    // =========================
    // STATS
    // =========================
    stats: {
      totalOrders: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      reviewsWritten: { type: Number, default: 0 },
      wishlistCount: { type: Number, default: 0 },
      compareCount: { type: Number, default: 0 },
      lastLoginAt: { type: Date, default: null },
      loginCount: { type: Number, default: 0 },
      accountAge: { type: Number, default: 0 }
    },

    // =========================
    // ECOMMERCE
    // =========================
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    compareList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    recentlyViewed: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        viewedAt: { type: Date, default: Date.now }
      }
    ],

    cart: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' },

    // =========================
    // SECURITY
    // =========================
    lastPasswordChange: { type: Date, default: Date.now },

    sessionTokens: [
      {
        token: String,
        device: String,
        browser: String,
        ip: String,
        location: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],

    deletionRequested: { type: Boolean, default: false },
    deletionScheduledAt: Date,

    notes: String
  },
  { timestamps: true }
);

// ---

// # 🔐 PASSWORD HASH (FIXED - with next parameter)
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// ---

// # 🔑 PASSWORD CHECK

userSchema.methods.comparePassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

// ---

// # 📊 LOGIN STATS (SAFE + FIXED)

userSchema.methods.updateLoginStats = async function ({ token, device }) {
  if (!this.stats) this.stats = {};

  this.stats.lastLoginAt = new Date();
  this.stats.loginCount = (this.stats.loginCount || 0) + 1;

  this.sessionTokens.push({
    token,
    device,
    browser: device || 'unknown',
    ip: 'unknown',
    location: 'unknown'
  });

  // keep only last 10 sessions
  if (this.sessionTokens.length > 10) {
    this.sessionTokens.shift();
  }

  await this.save();
};

// ---

// # 🔁 PASSWORD RESET TOKEN (SECURE)

userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return token;
};

// ---

// # ✅ EXPORT

module.exports = mongoose.model('User', userSchema);