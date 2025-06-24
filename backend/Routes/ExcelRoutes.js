const express = require('express');
const router = express.Router();
const multer = require('multer'); // For handling file uploads
const { 
  uploadExcel, 
  analyzeExcel, 
  getFiles, 
  getStats, 
  generateInsights 
} = require('../Controllers/ExcelControllers'); // Import controller functions
const auth = require('../Middleware/Auth'); // Auth middleware for route protection
const fs = require('fs/promises');
const path = require('path');
const File = require('../Models/File');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');

// Multer storage configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadsDir, { recursive: true }); // Ensure uploads dir exists
      cb(null, uploadsDir); // Save file in uploads directory
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename with timestamp
  }
});

const upload = multer({ storage }); // Multer instance with custom storage

// ---- ROUTES ----

// Upload Excel file (protected route)
router.post('/upload', auth, upload.single('file'), uploadExcel);

// Get all files uploaded by the current user
router.get('/files', auth, getFiles);

// Analyze a specific Excel file
router.post('/analyze', auth, analyzeExcel);

// Get user-specific file and chart stats
router.get('/stats', auth, getStats);

// Track a chart analysis performed by the user
router.post('/track-analysis', auth, async (req, res) => {
  try {
    const { filename, analysis } = req.body;
    
    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }

    // Find the file by filename and user
    const file = await File.findOne({ filename, user: req.user.id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Add a new analysis record to the file's analyses array
    file.analyses.push({
      chartType: analysis.chartType,
      xAxis: analysis.xAxis,
      yAxis: analysis.yAxis,
      createdAt: new Date()
    });

    await file.save(); // Save the updated file document
    
    res.json({
      message: 'Analysis tracked successfully',
      analysesCount: file.analyses.length
    });
  } catch (error) {
    console.error('Track analysis error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Generate AI-powered insights from Excel data
router.post('/generate-insights', auth, generateInsights);

// Export the router to be used in the main app
module.exports = router;
// This router handles all Excel-related operations such as file uploads, analysis, and insights generation.
// It uses Multer for file handling and is protected by authentication middleware.