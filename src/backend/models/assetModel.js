const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    unique: true,
    trim: true
  },
  pin_number: {
    type: Number,
    required: [true, 'Pin number is required']
  },
  description: {
    type: String,
    default: ''
  },
  current_state: {
    type: String,
    enum: ['RUNNING', 'STOPPED'],
    default: 'STOPPED'
  },
  availability_percentage: {
    type: Number,
    default: 0
  },
  runtime: {
    type: Number, // Stored in seconds
    default: 0
  },
  downtime: {
    type: Number, // Stored in seconds
    default: 0
  },
  total_stops: {
    type: Number,
    default: 0
  },
  last_state_change: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

module.exports = mongoose.model('Asset', assetSchema);