const { sequelize } = require('../../config/database');

// Import all models
const User = require('./User');
const Logger = require('./Logger');
const Asset = require('./Asset');
const Event = require('./Event');
const Shift = require('./Shift');
const Archive = require('./Archive');
const Settings = require('./Settings');
const Invitation = require('./Invitation');
const Team = require('./Team');
const TeamMember = require('./TeamMember');
const ShiftPattern = require('./ShiftPattern');
const TeamShiftAssignment = require('./TeamShiftAssignment');
const AuditLog = require('./AuditLog');

// Define associations
User.hasMany(Logger, { foreignKey: 'user_account_id', as: 'loggers' });
Logger.belongsTo(User, { foreignKey: 'user_account_id', as: 'user' });

Logger.hasMany(Asset, { foreignKey: 'logger_id', as: 'assets' });
Asset.belongsTo(Logger, { foreignKey: 'logger_id', as: 'logger' });

Asset.hasMany(Event, { foreignKey: 'asset_id', as: 'events' });
Event.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });

Logger.hasMany(Event, { foreignKey: 'logger_id', as: 'events' });
Event.belongsTo(Logger, { foreignKey: 'logger_id', as: 'logger' });

Shift.hasMany(Event, { foreignKey: 'shift_id', as: 'events' });
Event.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });

User.hasMany(Archive, { foreignKey: 'created_by', as: 'archives' });
Archive.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Invitation associations
User.hasMany(Invitation, { foreignKey: 'invited_by_user_id', as: 'invitations' });
Invitation.belongsTo(User, { foreignKey: 'invited_by_user_id', as: 'inviter' });

// Team associations
User.hasMany(Team, { foreignKey: 'owner_id', as: 'ownedTeams' });
Team.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// TeamMember associations
Team.hasMany(TeamMember, { foreignKey: 'team_id', as: 'members' });
TeamMember.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

User.hasMany(TeamMember, { foreignKey: 'user_id', as: 'teamMemberships' });
TeamMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(TeamMember, { foreignKey: 'invited_by', as: 'teamInvitations' });
TeamMember.belongsTo(User, { foreignKey: 'invited_by', as: 'inviter' });

// Many-to-many relationship between Users and Teams through TeamMember
User.belongsToMany(Team, { through: TeamMember, foreignKey: 'user_id', otherKey: 'team_id', as: 'teams' });
Team.belongsToMany(User, { through: TeamMember, foreignKey: 'team_id', otherKey: 'user_id', as: 'teamUsers' });

// ShiftPattern associations
User.hasMany(ShiftPattern, { foreignKey: 'created_by', as: 'createdShiftPatterns' });
ShiftPattern.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// TeamShiftAssignment associations
Team.hasMany(TeamShiftAssignment, { foreignKey: 'team_id', as: 'shiftAssignments' });
TeamShiftAssignment.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

ShiftPattern.hasMany(TeamShiftAssignment, { foreignKey: 'shift_pattern_id', as: 'teamAssignments' });
TeamShiftAssignment.belongsTo(ShiftPattern, { foreignKey: 'shift_pattern_id', as: 'shiftPattern' });

User.hasMany(TeamShiftAssignment, { foreignKey: 'assigned_by', as: 'assignedShiftPatterns' });
TeamShiftAssignment.belongsTo(User, { foreignKey: 'assigned_by', as: 'assignedBy' });

// Shift to ShiftPattern relationship
ShiftPattern.hasMany(Shift, { foreignKey: 'shift_pattern_id', as: 'shifts' });
Shift.belongsTo(ShiftPattern, { foreignKey: 'shift_pattern_id', as: 'shiftPattern' });

// AuditLog associations
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Logger,
  Asset,
  Event,
  Shift,
  Archive,
  Settings,
  Invitation,
  Team,
  TeamMember,
  ShiftPattern,
  TeamShiftAssignment,
  AuditLog
};