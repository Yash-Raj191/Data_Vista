const mongoose = require('mongoose');

// Define the schema for the File collection
const fileSchema = new mongoose.Schema({
  // The stored filename on the server, required
  filename: {
    type: String,
    required: true
  },
  // The original filename uploaded by the user, required
  originalName: {
    type: String,
    required: true
  },
  // Reference to the User who uploaded the file, required
  user: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
    ref: 'User', // Reference to User model
    required: true
  },
  // Size of the file in bytes, required
  size: {
    type: Number,
    required: true
  },
  // Timestamp when the file was uploaded, defaults to current date/time
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  // Array of analyses performed on this file, each with chart details
  analyses: [{
    chartType: {
      type: String,
      enum: ['line', 'bar', 'scatter', 'pie', 'bubble', 'radar'], // Allowed chart types
      required: true
    },
    xAxis: String, // X-axis data key
    yAxis: String, // Y-axis data key
    createdAt: {
      type: Date,
      default: Date.now // When this analysis was created
    }
  }],
  // Timestamp of last access to this file, defaults to current date/time
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, { collection: 'files' }); // Explicitly set collection name

// Export the Mongoose model named 'File' using the defined schema
module.exports = mongoose.model('File', fileSchema);
// This model can be used to interact with the 'files' collection in MongoDB
// and perform CRUD operations on file documents.