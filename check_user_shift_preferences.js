const databaseService = require('./src/backend/services/databaseService');

(async () => {
  try {
    console.log('🔍 CHECKING USER SHIFT REPORT PREFERENCES');
    console.log('=' .repeat(50));
    
    const users = await databaseService.getAllUsers();
    console.log(`\nFound ${users.length} users in the system:\n`);
    
    users.forEach(user => {
      console.log(`👤 ${user.name} (${user.email})`);
      if (user.shiftReportPreferences && user.shiftReportPreferences.enabled) {
        console.log(`   ✅ Shift reports: ENABLED`);
        console.log(`   📋 Preferences: ${JSON.stringify(user.shiftReportPreferences, null, 6)}`);
      } else {
        console.log(`   ❌ Shift reports: DISABLED or not configured`);
      }
      console.log('');
    });
    
    // Count enabled users
    const enabledUsers = users.filter(user => user.shiftReportPreferences?.enabled);
    console.log(`📊 Summary: ${enabledUsers.length} out of ${users.length} users have shift reports enabled`);
    
    if (enabledUsers.length === 0) {
      console.log('\n⚠️  WARNING: No users are configured to receive shift reports!');
      console.log('💡 To enable shift reports for a user:');
      console.log('   1. Go to User Management in the admin panel');
      console.log('   2. Edit a user and enable "Receive Shift Reports"');
      console.log('   3. Save the changes');
    }
    
  } catch (error) {
    console.error('❌ Error checking user preferences:', error.message);
  }
})();