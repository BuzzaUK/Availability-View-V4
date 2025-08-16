// Script to fix user shift preferences to match notification settings
const databaseService = require('./services/databaseService');

async function fixUserShiftPreferences() {
  console.log('🔧 FIXING USER SHIFT PREFERENCES');
  console.log('==================================================');
  
  try {
    // Get valid shift times from notification settings
    const notificationSettings = await databaseService.getSettings('notification_settings');
    const validShiftTimes = notificationSettings?.shiftSettings?.shiftTimes || [];
    
    console.log('✅ Valid shift times from notification settings:', validShiftTimes);
    
    if (validShiftTimes.length === 0) {
      console.log('❌ No valid shift times found in notification settings');
      return;
    }
    
    // Get all users
    const users = await databaseService.getAllUsers();
    console.log(`\n📋 Found ${users.length} users to check`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      console.log(`\n👤 Checking user: ${user.name} (${user.email})`);
      
      console.log('  Current shiftReportPreferences:', user.shiftReportPreferences);
      
      if (user.shiftReportPreferences && user.shiftReportPreferences.shifts) {
        const userShifts = user.shiftReportPreferences.shifts;
        console.log('  Current shifts:', userShifts);
        
        // Check if any preferences are invalid (not in notification settings)
        const invalidShifts = userShifts.filter(shift => !validShiftTimes.includes(shift));
        
        if (invalidShifts.length > 0) {
          console.log('  ❌ Invalid shifts found:', invalidShifts);
          
          // Reset to first valid shift time as default
          const newShiftPreferences = {
            ...user.shiftReportPreferences,
            shifts: [validShiftTimes[0]]
          };
          
          console.log('  🔄 Updating to:', newShiftPreferences);
          
          // Update user in database
          await databaseService.updateUser(user.id, {
            shiftReportPreferences: newShiftPreferences
          });
          
          updatedCount++;
          console.log('  ✅ User updated successfully');
        } else {
          console.log('  ✅ User shift preferences are valid');
        }
      } else {
        console.log('  ✅ User has no shift preferences configured');
      }
    }
    
    console.log(`\n🎉 COMPLETED: Updated ${updatedCount} users`);
    console.log('All users now have valid shift preferences that match notification settings.');
    
  } catch (error) {
    console.error('❌ Error fixing user shift preferences:', error);
  }
}

// Run the fix
fixUserShiftPreferences().then(() => {
  console.log('\n✅ Fix complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});