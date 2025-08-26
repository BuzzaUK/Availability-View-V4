const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const TeamShiftAssignment = sequelize.define('TeamShiftAssignment', {
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
  shift_pattern_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'shift_patterns',
      key: 'id'
    }
  },
  effective_from: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  effective_until: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Null means indefinite assignment'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Higher number = higher priority for overlapping assignments'
  },
  custom_overrides: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Team-specific overrides to the base shift pattern'
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'team_shift_assignments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['team_id', 'shift_pattern_id'],
      unique: false
    },
    {
      fields: ['team_id', 'is_active']
    },
    {
      fields: ['shift_pattern_id']
    },
    {
      fields: ['effective_from', 'effective_until']
    },
    {
      fields: ['assigned_by']
    }
  ],
  validate: {
    effectiveDateRange() {
      if (this.effective_until && this.effective_from >= this.effective_until) {
        throw new Error('Effective until date must be after effective from date');
      }
    }
  },
  hooks: {
    beforeCreate: async (assignment) => {
      // Deactivate any existing active assignments for the same team if this is active
      if (assignment.is_active) {
        await TeamShiftAssignment.update(
          { is_active: false },
          {
            where: {
              team_id: assignment.team_id,
              is_active: true,
              id: { [require('sequelize').Op.ne]: assignment.id }
            }
          }
        );
      }
    },
    beforeUpdate: async (assignment) => {
      // If this assignment is being activated, deactivate others for the same team
      if (assignment.changed('is_active') && assignment.is_active) {
        await TeamShiftAssignment.update(
          { is_active: false },
          {
            where: {
              team_id: assignment.team_id,
              is_active: true,
              id: { [require('sequelize').Op.ne]: assignment.id }
            }
          }
        );
      }
    }
  }
});

module.exports = TeamShiftAssignment;