const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add notes column to events table
    await queryInterface.addColumn('events', 'notes', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes and tags for the event'
    });
    
    console.log('✅ Added notes column to events table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove notes column from events table
    await queryInterface.removeColumn('events', 'notes');
    
    console.log('✅ Removed notes column from events table');
  }
};