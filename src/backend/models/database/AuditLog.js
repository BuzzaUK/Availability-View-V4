const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who performed the action (null for system actions)'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Action performed (CREATE, UPDATE, DELETE, etc.)'
  },
  resource_type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type of resource affected (team, shift_pattern, user, etc.)'
  },
  resource_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the affected resource'
  },
  resource_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Name/identifier of the affected resource'
  },
  old_values: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Previous values before the change'
  },
  new_values: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'New values after the change'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context and metadata'
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('success', 'failed', 'pending'),
    defaultValue: 'success'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // Audit logs should not be updated
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['resource_type', 'resource_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeCreate: (auditLog) => {
      // Ensure created_at is set
      if (!auditLog.created_at) {
        auditLog.created_at = new Date();
      }
    }
  }
});

// Static method to create audit log entries
AuditLog.logAction = async function({
  userId,
  action,
  resourceType,
  resourceId,
  resourceName,
  oldValues = null,
  newValues = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
  sessionId = null,
  severity = 'medium',
  status = 'success',
  errorMessage = null
}) {
  try {
    return await this.create({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName,
      old_values: oldValues,
      new_values: newValues,
      metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
      session_id: sessionId,
      severity,
      status,
      error_message: errorMessage
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

module.exports = AuditLog;