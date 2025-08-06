const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  file_path: {
    type: String,
    required: true
  },
  file_size: {
    type: Number, // Size in bytes
    required: true
  },
  content_type: {
    type: String,
    default: 'text/csv'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  assets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  }],
  event_count: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: false 
  }
});

module.exports = mongoose.model('Archive', archiveSchema);