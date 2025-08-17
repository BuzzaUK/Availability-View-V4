const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Shift = sequelize.define('Shift', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shift_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active'
  },
  total_runtime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total runtime in seconds'
  },
  total_downtime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total downtime in seconds'
  },
  total_stops: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  availability_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  performance_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  quality_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 100.00
  },
  oee_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  // Enhanced Analytics Fields
  mtbf_minutes: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Mean Time Between Failures in minutes'
  },
  mttr_minutes: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Mean Time To Repair in minutes'
  },
  stop_frequency: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0.00,
    comment: 'Stops per hour'
  },
  micro_stops_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of micro stops (< 5 minutes)'
  },
  micro_stops_time: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total micro stops time in seconds'
  },
  micro_stops_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: 'Micro stops as percentage of total downtime'
  },
  longest_stop_duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Longest stop duration in seconds'
  },
  average_stop_duration: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Average stop duration in seconds'
  },
  shift_pattern_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  archive_path: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'shifts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['start_time']
    },
    {
      fields: ['status']
    },
    {
      fields: ['archived']
    }
  ]
});

module.exports = Shift;