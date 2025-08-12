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