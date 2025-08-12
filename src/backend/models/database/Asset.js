const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Asset = sequelize.define('Asset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'machine'
  },
  pin_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  logger_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Change this to allow null temporarily
    references: {
      model: 'loggers',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  current_state: {
    type: DataTypes.ENUM('RUNNING', 'STOPPED', 'ERROR', 'MAINTENANCE'),
    defaultValue: 'STOPPED'
  },
  availability_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  runtime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Runtime in seconds'
  },
  downtime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Downtime in seconds'
  },
  total_stops: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  short_stop_threshold: {
    type: DataTypes.INTEGER,
    defaultValue: 300,
    comment: 'Short stop threshold in seconds'
  },
  long_stop_threshold: {
    type: DataTypes.INTEGER,
    defaultValue: 1800,
    comment: 'Long stop threshold in seconds'
  },
  downtime_reasons: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  last_state_change: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  manufacturer: {
    type: DataTypes.STRING,
    allowNull: true
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true
  },
  serial_number: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'assets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['logger_id']
    },
    {
      fields: ['pin_number', 'logger_id'],
      unique: true
    }
  ]
});

module.exports = Asset;