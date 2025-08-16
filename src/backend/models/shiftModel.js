const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  shift_number: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  start_time: {
    type: Date,
    required: true
  },
  end_time: {
    type: Date,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  assets: [{
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset'
    },
    asset_name: String,
    initial_state: {
      type: String,
      enum: ['RUNNING', 'STOPPED'],
      default: 'STOPPED'
    },
    final_state: {
      type: String,
      enum: ['RUNNING', 'STOPPED'],
      default: null
    },
    availability: {
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
    }
  }],
  notes: {
    type: String,
    default: ''
  },
  report_sent: {
    type: Boolean,
    default: false
  },
  report_sent_at: {
    type: Date,
    default: null
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

module.exports = mongoose.model('Shift', shiftSchema);