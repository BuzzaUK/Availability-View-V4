const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Archive = sequelize.define('Archive', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  archive_type: {
    type: DataTypes.ENUM('EVENTS', 'REPORTS', 'BACKUPS', 'CUSTOM', 'SHIFT_REPORT'),
    allowNull: false,
    defaultValue: 'EVENTS'
  },
  date_range_start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  date_range_end: {
    type: DataTypes.DATE,
    allowNull: true
  },
  filters: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  archived_data: {
    type: DataTypes.JSON,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'File size in bytes'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
    defaultValue: 'PENDING'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'archives',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['archive_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['date_range_start', 'date_range_end']
    }
  ]
});

module.exports = Archive;