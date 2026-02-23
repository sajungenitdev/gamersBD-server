const express = require('express');
const router = express.Router();

// Temporary auth controller
const authController = {
  register: (req, res) => {
    res.status(201).json({ 
      success: true,
      message: 'User registered successfully', 
      data: req.body 
    });
  },
  
  login: (req, res) => {
    res.status(200).json({ 
      success: true,
      message: 'Login successful', 
      data: {
        token: 'dummy-token',
        user: { email: req.body.email }
      } 
    });
  },
  
  getProfile: (req, res) => {
    res.status(200).json({ 
      success: true,
      message: 'User profile',
      data: { 
        id: 1, 
        name: 'Test User', 
        email: 'test@example.com' 
      } 
    });
  }
};

// Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authController.getProfile);

module.exports = router;