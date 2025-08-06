const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  asset_name: {
    type: String,
    required: true
  },
  event_type: {
    type: String,
    enum: ['START', 'STOP', 'SHIFT'],
    required: true
  },
  state: {
    type: String,
    enum: ['RUNNING', 'STOPPED'],
    required: true
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
  stops: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // Duration of this state in seconds
    default: 0
  },
  note: {
    type: String,
    default: ''
  },
  downtime_reason: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
eventSchema.index({ asset: 1, timestamp: -1 });
eventSchema.index({ asset_name: 1, timestamp: -1 });
eventSchema.index({ event_type: 1 });
eventSchema.index({ shift: 1 });

module.exports = mongoose.model('Event', eventSchema);