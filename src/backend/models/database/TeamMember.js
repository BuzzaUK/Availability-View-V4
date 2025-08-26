const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const TeamMember = sequelize.define('TeamMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  team_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'teams',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'),
    allowNull: false,
    defaultValue: 'member'
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      assets: {
        view: true,
        create: false,
        edit: false,
        delete: false
      },
      events: {
        view: true,
        create: false,
        edit: false,
        delete: false
      },
      reports: {
        view: true,
        create: false,
        edit: false,
        delete: false
      },
      analytics: {
        view: true,
        export: false
      },
      team: {
        invite: false,
        remove: false,
        editSettings: false
      }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'suspended'),
    allowNull: false,
    defaultValue: 'pending'
  },
  invited_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  invited_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  joined_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_activity: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'team_members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['team_id', 'user_id'],
      unique: true
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['team_id', 'role']
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeCreate: (teamMember) => {
      if (teamMember.status === 'active' && !teamMember.joined_at) {
        teamMember.joined_at = new Date();
      }
      if (!teamMember.invited_at) {
        teamMember.invited_at = new Date();
      }
    },
    beforeUpdate: (teamMember) => {
      if (teamMember.changed('status') && teamMember.status === 'active' && !teamMember.joined_at) {
        teamMember.joined_at = new Date();
      }
    }
  }
});

module.exports = TeamMember;