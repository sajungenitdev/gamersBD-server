const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// REGISTER - No next parameter
const register = async (req, res) => {
  try {
    const { name, email, password, role, adminSecret } = req.body;

    console.log('📝 Registration attempt:', { name, email });

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Split name for firstName/lastName
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Determine user role
    let userRole = 'user';
    if (role === 'admin' && adminSecret === process.env.ADMIN_SECRET) {
      userRole = 'admin';
    }

    // Create user with all fields
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      firstName,
      lastName,
      phone: '',
      bio: '',
      avatar: null,
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Bangladesh'
      },
      preferences: {
        newsletter: false,
        emailNotifications: true,
        language: 'en',
        currency: 'BDT',
        theme: 'dark'
      },
      stats: {
        totalOrders: 0,
        totalSpent: 0,
        reviewsWritten: 0,
        wishlistCount: 0,
        loginCount: 0
      }
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        bio: user.bio,
        avatar: user.avatar,
        createdAt: user.createdAt,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// LOGIN - No next parameter
const login = async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// In your auth.controller.js
const updateProfile = async (req, res) => {
  try {
    const { avatar, firstName, lastName, phone, bio } = req.body;

    const user = await User.findById(req.user._id);

    // Handle base64 avatar
    if (avatar) {
      // Validate base64 format
      const isValid = /^data:image\/(jpeg|png|jpg|gif|webp);base64,/.test(avatar);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image format. Please provide a valid base64 image.'
        });
      }

      // Check size (approx 5MB max)
      const base64Size = Buffer.from(avatar.split(',')[1], 'base64').length;
      if (base64Size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Image too large. Maximum 5MB allowed.'
        });
      }

      user.avatar = avatar;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getUsers = async (req, res) => {
  res.json({ success: true, message: 'Get users endpoint' });
};

const getUserById = async (req, res) => {
  res.json({ success: true, message: 'Get user by ID endpoint' });
};

const updateUser = async (req, res) => {
  res.json({ success: true, message: 'Update user endpoint' });
};

const deleteUser = async (req, res) => {
  res.json({ success: true, message: 'Delete user endpoint' });
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
};