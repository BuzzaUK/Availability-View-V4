const mongoose = require('mongoose');

const downtimeReasonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#FF0000' // Default red color
  }
});

const shiftScheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  start_time: {
    type: String, // Format: HH:MM (24-hour)
    required: true
  },
  end_time: {
    type: String, // Format: HH:MM (24-hour)
    required: true
  },
  days: {
    type: [Number], // 0-6 (Sunday-Saturday)
    default: [0, 1, 2, 3, 4, 5, 6]
  }
});

const configSchema = new mongoose.Schema({
  company_name: {
    type: String,
    default: 'Asset Monitoring System'
  },
  logo_url: {
    type: String,
    default: ''
  },
  micro_stop_threshold: {
    type: Number,
    default: 30, // seconds
    min: 1
  },
  downtime_reasons: {
    type: [downtimeReasonSchema],
    default: [
      { name: 'Maintenance', description: 'Scheduled maintenance', color: '#FFA500' },
      { name: 'Breakdown', description: 'Equipment failure', color: '#FF0000' },
      { name: 'Setup', description: 'Product changeover', color: '#0000FF' },
      { name: 'Material Shortage', description: 'Waiting for materials', color: '#FFFF00' },
      { name: 'Quality Issue', description: 'Quality problems', color: '#800080' }
    ]
  },
  shift_schedules: {
    type: [shiftScheduleSchema],
    default: [
      { name: 'Morning Shift', start_time: '06:00', end_time: '14:00' },
      { name: 'Afternoon Shift', start_time: '14:00', end_time: '22:00' },
      { name: 'Night Shift', start_time: '22:00', end_time: '06:00' }
    ]
  },
  report_recipients: {
    type: [{
      email: String,
      name: String,
      role: String
    }],
    default: []
  },
  report_schedule: {
    type: String,
    enum: ['end_of_shift', 'daily', 'weekly', 'monthly', 'never'],
    default: 'end_of_shift'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

module.exports = mongoose.model('Config', configSchema);