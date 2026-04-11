const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  forgotPassword,
  resetPassword
} = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// ====================================
// ROOT ROUTE - This fixes the 404
// ====================================
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is working',
    endpoints: {
      test: 'GET /api/auth/test',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/profile (Protected)',
      changePassword: 'PUT /api/auth/change-password (Protected)',
      forgotPassword: 'POST /api/auth/forgot-password',
      resetPassword: 'POST /api/auth/reset-password',
      users: 'GET /api/auth/users (Admin only)'
    },
    timestamp: new Date().toISOString()
  });
});

// ====================================
// TEST ROUTE
// ====================================
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth route works!',
    timestamp: new Date().toISOString()
  });
});

// ====================================
// PUBLIC ROUTES (No authentication required)
// ====================================
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ====================================
// PROTECTED ROUTES (Authentication required)
// ====================================
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// ====================================
// ADMIN ONLY ROUTES
// ====================================
router.get('/users', protect, authorize('admin'), getUsers);
router.get('/users/:id', protect, authorize('admin'), getUserById);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;