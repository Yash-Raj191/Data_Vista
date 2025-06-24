const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  updateSettings, 
  getSettings,
  createAdmin 
} = require('../Controllers/UserControllers.js');
const auth = require('../Middleware/Auth');

// Route for user registration, no authentication required
router.post('/register', register);

// Route for user login, no authentication required
router.post('/login', login);

// Route to update user settings, requires authentication
router.post('/settings', auth, updateSettings);

// Route to get user settings, requires authentication
router.get('/settings', auth, getSettings);

// Route to create an admin user, no authentication middleware applied here
router.post('/create-admin', createAdmin); // Add this line

// Export the router to be used in the main app
module.exports = router;
// This router handles user-related operations such as registration, login, and settings management.
// It uses authentication middleware for protected routes and allows admin creation without authentication.