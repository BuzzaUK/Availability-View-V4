const { sequelize } = require('../config/database');
const User = require('../models/database/User');

async function migrateUserPreferences() {
  try {
    console.log('Starting user preferences migration...');
    
    // Get all users
    const users = await User.findAll();
    
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      // Check if user already has shiftReportPreferences
      if (!user.shiftReportPreferences || typeof user.shiftReportPreferences !== 'object') {
        console.log(`Migrating user: ${user.email}`);
        
        await user.update({
          shiftReportPreferences: {
            enabled: false,
            shifts: [],
            emailFormat: 'pdf'
          }
        });
        
        console.log(`✅ Migrated user: ${user.email}`);
      } else {
        console.log(`✓ User ${user.email} already has shiftReportPreferences`);
      }
    }
    
    console.log('✅ User preferences migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateUserPreferences()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateUserPreferences;