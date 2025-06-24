// Admin authentication middleware
const adminAuth = (req, res, next) => {
  try {
    // Check if user is attached to the request (should be set by previous auth middleware)
    if (!req.user) {
      // If not authenticated, return 401 Unauthorized
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user has the 'admin' role
    if (!req.user.role || req.user.role !== 'admin') {
      // If not admin, return 403 Forbidden
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // If authenticated and admin, proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Log any unexpected errors and return 403 Forbidden
    console.error('Admin auth error:', error);
    res.status(403).json({ message: 'Admin access required' });
  }
};

module.exports = adminAuth;
