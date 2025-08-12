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
  Invitation
};