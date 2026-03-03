// routes/user.routes.js
const express = require('express');
const router = express.Router();
const {
  updateProfile,
  getUsers,
  getUserById,
  updateUser,  // Make sure this is imported
  deleteUser
} = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

// User routes (accessible by authenticated users)
router.put('/profile', updateProfile);

// Admin only routes
router.get('/', authorize('admin'), getUsers);
router.get('/:id', authorize('admin'), getUserById);
router.put('/:id', authorize('admin'), updateUser);  // This should be here
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;