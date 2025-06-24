const User = require('../Models/User'); // Import User model
const jwt = require('jsonwebtoken'); // JWT for authentication tokens
const bcrypt = require('bcryptjs'); // Password hashing library

// User registration controller
exports.register = async (req, res) => {
  try {
    const { username, email, password, adminCode } = req.body;

    // Check if user already exists by email or username
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists' 
      });
    }

    // Validate admin registration code
    if (adminCode && adminCode !== process.env.ADMIN_SECRET) {
      return res.status(400).json({
        message: 'Invalid admin code'
      });
    }

    // Create new user with role determination
    const user = new User({
      username,
      email,
      password, // Password will be hashed by pre-save hook in model
      role: adminCode === process.env.ADMIN_SECRET ? 'admin' : 'user'
    });

    await user.save(); // Save user to database

    // Generate JWT token with user ID and role
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Token valid for 24 hours
    );

    // Return success response with token and user data
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        settings: user.settings
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User login controller
exports.login = async (req, res) => {
  try {
    const { email, password, adminCode } = req.body;
    const user = await User.findOne({ email });

    // Validate user existence
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Special handling for admin login attempts
    if (adminCode) {
      if (adminCode !== process.env.ADMIN_SECRET || user.role !== 'admin') {
        return res.status(403).json({ message: 'Invalid admin credentials' });
      }
    }

    // Check account activation status
    if (!user.isActive) {
      return res.status(400).json({ 
        message: 'Account is inactive. Please contact administrator.' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        role: user.role 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response
    res.json({ 
      token, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        settings: user.settings
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user settings
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Return settings with default values if not set
    res.json({ 
      settings: {
        notifications: user.settings?.notifications ?? true
      } 
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update user settings
exports.updateSettings = async (req, res) => {
  try {
    const { notifications } = req.body;
    // Update user settings using atomic operation
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { 
        $set: { 
          'settings.notifications': notifications 
        } 
      },
      { new: true } // Return updated document
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Settings updated successfully', 
      settings: user.settings 
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin creation endpoint (for privileged users)
exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password, adminSecret } = req.body;
    
    // Verify admin secret matches environment variable
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: 'Invalid admin secret' });
    }

    // Check for existing user
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new admin user
    const user = new User({
      username,
      email,
      password,
      role: 'admin'
    });

    await user.save();
    res.status(201).json({ message: 'Admin user created successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
