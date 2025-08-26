const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ShiftPattern = sequelize.define('ShiftPattern', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pattern_type: {
    type: DataTypes.ENUM('fixed', 'rotating', 'flexible'),
    allowNull: false,
    defaultValue: 'fixed'
  },
  shift_duration_hours: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
    validate: {
      min: 0.5,
      max: 24
    }
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: 'Default start time for this pattern (HH:MM:SS)'
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: 'Default end time for this pattern (HH:MM:SS)'
  },
  break_duration_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 480
    }
  },
  days_of_week: {
    type: DataTypes.JSON,
    defaultValue: [1, 2, 3, 4, 5], // Monday to Friday
    comment: 'Array of day numbers (0=Sunday, 1=Monday, etc.)'
  },
  rotation_schedule: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'For rotating shifts: array of shift configurations'
  },
  overtime_rules: {
    type: DataTypes.JSON,
    defaultValue: {
      enabled: false,
      threshold_hours: 8,
      multiplier: 1.5
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  color_code: {
    type: DataTypes.STRING(7),
    defaultValue: '#1976d2',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  }
}, {
  tableName: 'shift_patterns',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['pattern_type']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['created_by']
    }
  ],
  hooks: {
    beforeValidate: (shiftPattern) => {
      // Ensure end_time is after start_time for fixed patterns
      if (shiftPattern.pattern_type === 'fixed' && shiftPattern.start_time && shiftPattern.end_time) {
        const start = new Date(`1970-01-01T${shiftPattern.start_time}`);
        const end = new Date(`1970-01-01T${shiftPattern.end_time}`);
        
        if (end <= start) {
          // Handle overnight shifts
          end.setDate(end.getDate() + 1);
        }
        
        const durationHours = (end - start) / (1000 * 60 * 60);
        if (Math.abs(durationHours - shiftPattern.shift_duration_hours) > 0.1) {
          shiftPattern.shift_duration_hours = Math.round(durationHours * 100) / 100;
        }
      }
    }
  }
});

module.exports = ShiftPattern;