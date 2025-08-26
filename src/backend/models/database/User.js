const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
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
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'manager', 'operator', 'viewer'),
    defaultValue: 'viewer'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      system: {
        manageUsers: false,
        manageTeams: false,
        systemSettings: false
      },
      data: {
        viewAll: false,
        exportAll: false,
        deleteAll: false
      },
      teams: {
        create: false,
        join: true,
        invite: false
      }
    }
  },
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        browser: true,
        teamInvites: true,
        dataSharing: true
      },
      dashboard: {
        defaultView: 'overview',
        refreshInterval: 30
      }
    }
  },
  current_team_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'teams',
      key: 'id'
    }
  },
  receive_reports: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  shiftReportPreferences: {
    type: DataTypes.JSON,
    defaultValue: {
      enabled: false,
      shifts: [],
      emailFormat: 'pdf'
    }
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  profile: {
    type: DataTypes.JSON,
    defaultValue: {
      avatar: null,
      bio: '',
      department: '',
      position: '',
      phone: '',
      location: ''
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

module.exports = User;