const databaseService = require('./src/backend/services/databaseService');

async function testFrontendShiftTimes() {
  try {
    console.log('🔍 Testing what the frontend should receive for shift times...');
    
    // Get notification settings (same as the API endpoint)
    const settings = await databaseService.getNotificationSettings();
    console.log('\n📋 Raw notification settings from database:');
    console.log(JSON.stringify(settings, null, 2));
    
    // Extract shift times like the API would
    const shiftTimes = settings.shiftSettings?.shiftTimes || [];
    console.log('\n⏰ Shift times that should appear in frontend dropdown:');
    console.log('Raw shift times:', shiftTimes);
    
    // Format them like the frontend does
    const formattedTimes = shiftTimes.map(time => {
      if (time.length === 4) {
        return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
      }
      return time;
    });
    
    console.log('Formatted for display:', formattedTimes);
    
    // Check if there are any unexpected times
    const expectedTimes = ['0600', '1400', '2200'];
    const unexpectedTimes = shiftTimes.filter(time => !expectedTimes.includes(time));
    
    if (unexpectedTimes.length > 0) {
      console.log('\n⚠️ FOUND UNEXPECTED TIMES:', unexpectedTimes);
      console.log('These will show up in the Edit User dropdown!');
    } else {
      console.log('\n✅ All shift times look correct');
    }
    
    // Simulate the API response structure
    const apiResponse = {
      success: true,
      data: settings
    };
    
    console.log('\n🌐 API response structure:');
    console.log('response.data.data.shiftSettings.shiftTimes:', apiResponse.data.shiftSettings?.shiftTimes);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFrontendShiftTimes();