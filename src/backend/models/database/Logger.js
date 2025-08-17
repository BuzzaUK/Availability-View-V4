const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Logger = sequelize.define('Logger', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  logger_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  user_account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  logger_name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Unnamed Logger'
  },
  status: {
    type: DataTypes.ENUM('online', 'offline', 'error'),
    defaultValue: 'offline'
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIP: true
    }
  },
  firmware_version: {
    type: DataTypes.STRING,
    defaultValue: 'Unknown'
  },
  last_seen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  wifi_ssid: {
    type: DataTypes.STRING,
    allowNull: true
  },
  wifi_password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  server_url: {
    type: DataTypes.STRING,
    defaultValue: 'http://localhost:5000'
  }
}, {
  tableName: 'loggers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Logger;