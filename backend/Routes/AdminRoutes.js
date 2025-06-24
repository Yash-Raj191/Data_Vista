const express = require('express');
const router = express.Router();

// Import controller functions for admin operations
const { getUsers, getStats, updateUserStatus } = require('../Controllers/AdminControllers');

// Import authentication middleware
const auth = require('../Middleware/Auth');
const adminAuth = require('../Middleware/AdminAuth');

// Apply both authentication and admin authorization middleware to all routes in this router
router.use(auth, adminAuth);

// Route to get list of users, accessible only to authenticated admins
router.get('/users', getUsers);

// Route to get admin dashboard statistics
router.get('/stats', getStats);

// Route to update user active/inactive status
router.patch('/users/:id/status', updateUserStatus);

// Export the router to be used in main app
module.exports = router;
// This router handles admin-specific operations such as user management and statistics
// and is protected by authentication and admin authorization middleware.