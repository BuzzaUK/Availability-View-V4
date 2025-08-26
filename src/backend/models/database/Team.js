const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Team = sequelize.define('Team', {
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
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      allowMemberInvites: true,
      dataSharing: {
        assets: true,
        events: true,
        reports: true,
        analytics: true
      },
      notifications: {
        memberJoined: true,
        memberLeft: true,
        dataShared: true
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  maxMembers: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    validate: {
      min: 1,
      max: 1000
    }
  }
}, {
  tableName: 'teams',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['owner_id']
    },
    {
      fields: ['name'],
      unique: false
    }
  ]
});

module.exports = Team;