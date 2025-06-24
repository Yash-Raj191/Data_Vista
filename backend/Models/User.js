const mongoose = require('mongoose'); // MongoDB ODM library
const bcrypt = require('bcryptjs'); // Password hashing library

// Define the User schema
const userSchema = new mongoose.Schema({
  // Username field
  username: {
    type: String,
    required: true, // Must be provided
    unique: true,   // No duplicate usernames
    trim: true      // Remove whitespace
  },
  // Email field
  email: {
    type: String,
    required: true, // Must be provided
    unique: true,   // No duplicate emails
    trim: true      // Remove whitespace
  },
  // Password field (hashed before saving)
  password: {
    type: String,
    required: true  // Must be provided
  },
  // User role (admin or regular user)
  role: {
    type: String,
    enum: ['user', 'admin'], // Only these values allowed
    default: 'user'          // Default to regular user
  },
  // User preferences/settings
  settings: {
    // UI theme preference
    theme: {
      type: String,
      enum: ['light', 'dark'], // Only these values allowed
      default: 'light'         // Default to light theme
    },
    // Notification preferences
    notifications: {
      type: Boolean,
      default: true  // Notifications enabled by default
    }
  },
  // Account status (active/inactive)
  isActive: {
    type: Boolean,
    default: true  // Accounts active by default
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Middleware: Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash password if it was modified
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt and hash password (10 rounds)
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Export the Mongoose model named 'User'
module.exports = mongoose.model('User', userSchema);
// This model can be used to interact with the 'users' collection in MongoDB
// and perform CRUD operations on user documents.