// Load environment variables from .env file at the very beginning
require('dotenv').config();

// Import required modules
const express = require('express'); // Express framework
const cors = require('cors'); // CORS middleware for cross-origin requests
const mongoose = require('mongoose'); // MongoDB ODM
const userRoutes = require('./Routes/UserRoutes'); // User-related routes
const excelRoutes = require('./Routes/ExcelRoutes'); // Excel-related routes
const adminRoutes = require('./Routes/AdminRoutes'); // Admin routes

// Create Express application
const app = express();

// Middleware setup
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Basic health check route
app.get('/', (req, res) => {
  res.send('Excel Analytics API is running');
});

// Route mounting
app.use('/api/users', userRoutes); // All user routes under /api/users
app.use('/api/excel', excelRoutes); // All Excel routes under /api/excel
app.use('/api/admin', adminRoutes); // All admin routes under /api/admin

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI) // Use connection string from .env
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Start server
const PORT = process.env.PORT || 5000; // Use PORT from .env or default to 5000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
