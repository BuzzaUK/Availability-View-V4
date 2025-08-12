const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  asset_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'assets',
      key: 'id'
    }
  },
  logger_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'loggers',
      key: 'id'
    }
  },
  event_type: {
    type: DataTypes.ENUM(
      'STATE_CHANGE', 
      'STOP_START', 
      'STOP_END', 
      'MICRO_STOP', 
      'SHIFT_START', 
      'SHIFT_END',
      'MAINTENANCE_START',
      'MAINTENANCE_END',
      'ERROR',
      'HEARTBEAT'
    ),
    allowNull: false
  },
  previous_state: {
    type: DataTypes.ENUM('RUNNING', 'STOPPED', 'ERROR', 'MAINTENANCE'),
    allowNull: true
  },
  new_state: {
    type: DataTypes.ENUM('RUNNING', 'STOPPED', 'ERROR', 'MAINTENANCE'),
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in seconds'
  },
  stop_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  shift_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'shifts',
      key: 'id'
    }
  }
}, {
  tableName: 'events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['asset_id']
    },
    {
      fields: ['logger_id']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['event_type']
    },
    {
      fields: ['shift_id']
    },
    {
      fields: ['processed']
    }
  ]
});

module.exports = Event;