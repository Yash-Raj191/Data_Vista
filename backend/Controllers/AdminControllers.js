const User = require('../Models/User');
const File = require('../Models/File');

// Controller function to get all users with their file statistics
exports.getUsers = async (req, res) => {
  try {
    // Using MongoDB aggregation to join users with their files
    const users = await User.aggregate([
      {
        // Join users collection with files collection
        $lookup: {
          from: 'files',          // Collection to join with (files collection)
          localField: '_id',      // User ID field from users collection
          foreignField: 'user',   // Corresponding user field in files collection
          as: 'files'             // Output array name for joined files
        }
      },
      {
        // Project (select) specific fields to include in output
        $project: {
          username: 1,            // Include username
          email: 1,               // Include email
          role: 1,                // Include role
          isActive: 1,            // Include active status
          filesCount: { $size: '$files' },  // Count number of files
          totalStorage: { 
            $sum: '$files.size'   // Sum of all file sizes for the user
          }
        }
      }
    ]);
    
    // Send JSON response with users array
    res.json({ users });
  } catch (error) {
    // Handle errors and send 500 status with error message
    res.status(500).json({ message: error.message });
  }
};

// Controller function to get admin dashboard statistics
exports.getStats = async (req, res) => {
  try {
    // Count total users
    const totalUsers = await User.countDocuments();
    // Count active users (where isActive=true)
    const activeUsers = await User.countDocuments({ isActive: true });
    // Count total files
    const totalFiles = await File.countDocuments();
    
    // Aggregate most used chart types from file analyses
    const chartStats = await File.aggregate([
      // Filter files that have analyses (non-empty array)
      { $match: { analyses: { $exists: true, $ne: [] } } },
      // Deconstruct analyses array into separate documents
      { $unwind: '$analyses' },
      {
        // Group by chartType and count occurrences
        $group: {
          _id: '$analyses.chartType',  // Group key (chart type)
          count: { $sum: 1 }           // Count each occurrence
        }
      },
      // Sort by count descending (most used first)
      { $sort: { count: -1 } }
    ]).exec() || [];  // Fallback to empty array if null

    // Aggregate storage statistics
    const storageStats = await File.aggregate([
      {
        // Group all documents together (no specific _id)
        $group: {
          _id: null,  // Group all files together
          totalStorage: { $sum: '$size' },       // Sum of all file sizes
          averageFileSize: { $avg: '$size' }     // Average file size
        }
      }
    ]).exec() || [{ totalStorage: 0, averageFileSize: 0 }];  // Fallback if empty

    // Get recent file upload activity
    const recentActivity = await File.aggregate([
      {
        // Join files with users collection
        $lookup: {
          from: 'users',          // Collection to join with
          localField: 'user',     // File's user field
          foreignField: '_id',    // User's _id field
          as: 'userDetails'       // Output array name
        }
      },
      // Convert userDetails array to object (single user)
      { $unwind: '$userDetails' },
      // Sort by upload date (newest first)
      { $sort: { uploadedAt: -1 } },
      // Limit to 10 most recent
      { $limit: 10 },
      {
        // Select specific fields to include
        $project: {
          filename: 1,          // File name
          uploadedAt: 1,         // Upload timestamp
          username: '$userDetails.username',  // Username from joined user
          // Count number of analyses (if exists)
          analyses: { 
            $cond: {
              if: { $isArray: "$analyses" },  // Check if analyses is array
              then: { $size: "$analyses" },   // Return array size if true
              else: 0                          // Return 0 if not array
            }
          }
        }
      }
    ]).exec() || [];  // Fallback to empty array if null
    
    // Send comprehensive stats as JSON
    res.json({
      users: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        inactive: (totalUsers - activeUsers) || 0
      },
      files: {
        total: totalFiles || 0,
        totalStorage: storageStats[0]?.totalStorage || 0,
        averageFileSize: storageStats[0]?.averageFileSize || 0
      },
      chartUsage: chartStats,      // Most used chart types
      recentActivity               // Recent file uploads
    });
  } catch (error) {
    // Log error and send 500 response
    console.error('Admin stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch admin statistics',
      error: error.message 
    });
  }
};

// Controller to update user active/inactive status
exports.updateUserStatus = async (req, res) => {
  try {
    // Get user ID from URL parameters
    const { id } = req.params;
    // Get new status from request body
    const { isActive } = req.body;
    
    // Find user by ID and update status
    const user = await User.findByIdAndUpdate(
      id,               // User ID to update
      { isActive },     // New status value
      { new: true }     // Return updated document
    );
    
    // Handle user not found
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Send success response with updated user
    res.json({ message: 'User status updated', user });
  } catch (error) {
    // Handle errors
    res.status(500).json({ message: error.message });
  }
};
