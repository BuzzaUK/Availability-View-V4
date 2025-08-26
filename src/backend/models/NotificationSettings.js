const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: true
  },
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  emailSettings: {
    smtpServer: {
      type: String,
      default: ''
    },
    port: {
      type: Number,
      default: 587
    },
    username: {
      type: String,
      default: ''
    },
    password: {
      type: String,
      default: ''
    },
    fromEmail: {
      type: String,
      default: ''
    },
    useTLS: {
      type: Boolean,
      default: true
    }
  },
  smsSettings: {
    provider: {
      type: String,
      enum: ['twilio', 'aws'],
      default: 'twilio'
    },
    accountSid: {
      type: String,
      default: ''
    },
    authToken: {
      type: String,
      default: ''
    },
    fromNumber: {
      type: String,
      default: ''
    }
  },
  shiftSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    shiftTimes: [{
      type: String,
      validate: {
        validator: function(v) {
          return /^(\d{4}|\d{2}:\d{2})$/.test(v);
        },
        message: 'Shift time must be in HHMM or HH:MM format'
      }
    }],
    emailFormat: {
      type: String,
      enum: ['pdf', 'html'],
      default: 'pdf'
    },
    autoSend: {
      type: Boolean,
      default: true
    }
  },
  eventNotifications: {
    assetStopped: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['inApp', 'email', 'sms']
      }],
      minDuration: {
        type: Number,
        default: 5 // minutes
      },
      recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },
    assetWarning: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['inApp', 'email', 'sms']
      }],
      recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },
    shiftStart: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['inApp', 'email', 'sms']
      }],
      recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },
    shiftEnd: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['inApp', 'email', 'sms']
      }],
      recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },

  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
notificationSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      shiftSettings: {
        enabled: false,
        shiftTimes: ['08:00', '16:00', '00:00'],
        emailFormat: 'pdf',
        autoSend: true
      }
    });
  }
  return settings;
};

notificationSettingsSchema.statics.updateSettings = async function(updates) {
  let settings = await this.getSettings();
  Object.assign(settings, updates);
  return await settings.save();
};

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema);