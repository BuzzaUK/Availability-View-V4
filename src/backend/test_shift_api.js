// Test the notification settings API directly using database service
const databaseService = require('./services/databaseService');

async function testShiftAPI() {
  try {
    console.log('🔍 Testing shift times data that API would return...');
    
    // Get the data directly from database service (same as API endpoint)
    const settings = await databaseService.getNotificationSettings();
    
    // Simulate the API response structure from /api/notifications/settings
    const apiResponse = {
      success: true,
      data: settings
    };
    
    console.log('✅ Simulated API Response Structure:', JSON.stringify(apiResponse, null, 2));
    
    // Check the path that frontend expects: response.data.data.shiftSettings.shiftTimes
    const shiftTimes = apiResponse.data?.shiftSettings?.shiftTimes;
    console.log('\n🎯 Shift times at expected path (response.data.data.shiftSettings.shiftTimes):', shiftTimes);
    
    if (Array.isArray(shiftTimes)) {
      console.log('✅ Shift times is an array with', shiftTimes.length, 'items');
      shiftTimes.forEach((time, index) => {
        console.log(`  ${index}: '${time}'`);
      });
      
      // Check if these are the expected formatted times
      const expectedFormat = /^\d{2}:\d{2}$/;
      const allProperlyFormatted = shiftTimes.every(time => expectedFormat.test(time));
      
      if (allProperlyFormatted) {
        console.log('✅ All shift times are properly formatted (HH:MM)');
      } else {
        console.log('❌ Some shift times are not properly formatted');
      }
      
    } else {
      console.log('❌ Shift times is not an array:', typeof shiftTimes);
    }
    
    console.log('\n📝 Summary:');
    console.log('- Frontend calls: /api/notifications/settings');
    console.log('- Expected response structure: {success: true, data: settings}');
    console.log('- Frontend accesses: response.data.data.shiftSettings.shiftTimes');
    console.log('- Current shift times:', shiftTimes);
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }
  
  process.exit(0);
}

testShiftAPI();