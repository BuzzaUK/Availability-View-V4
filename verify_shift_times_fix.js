const databaseService = require('./src/backend/services/databaseService');

async function verifyShiftTimesFix() {
  console.log('🔍 Verifying shift times fix...');
  
  try {
    // Test the database directly
    console.log('\n1. Testing database values:');
    const settings = await databaseService.getNotificationSettings();
    console.log('Database shift times:', settings.shiftSettings.shiftTimes);
    
    // Check if the database contains the correct shift times
    const expectedTimes = ['0600', '1400', '2200'];
    const actualTimes = settings.shiftSettings.shiftTimes;
    
    if (JSON.stringify(actualTimes) === JSON.stringify(expectedTimes)) {
      console.log('✅ Database has correct shift times');
    } else {
      console.log('❌ Database has incorrect shift times');
      console.log('Expected:', expectedTimes);
      console.log('Actual:', actualTimes);
    }
    
    console.log('\n2. Frontend code changes made:');
    console.log('- UserManagement.js: Removed hardcoded shift times');
    console.log('- NotificationSettings.js: Removed hardcoded shift times');
    console.log('- StateDistribution.js: Removed hardcoded shift times');
    
    console.log('\n3. Frontend should now show:');
    console.log('- 06:00 Shift');
    console.log('- 14:00 Shift');
    console.log('- 22:00 Shift');
    
    console.log('\n4. If you still see legacy times, try:');
    console.log('- Hard refresh the browser (Ctrl+F5 or Cmd+Shift+R)');
    console.log('- Clear browser cache and cookies');
    console.log('- Try incognito/private browsing mode');
    console.log('- Close and reopen the browser completely');
    
  } catch (error) {
    console.error('❌ Error testing database:', error.message);
  }
}

verifyShiftTimesFix();