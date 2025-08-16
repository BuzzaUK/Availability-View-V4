// Test the notification settings API response structure
const databaseService = require('./src/backend/services/databaseService');

async function testNotificationAPI() {
  console.log('🔍 Testing notification settings API response structure...');
  
  try {
    // Get the settings directly from the database service
    const settings = await databaseService.getNotificationSettings();
    
    console.log('✅ Raw Database Settings:', JSON.stringify(settings, null, 2));
    
    // Simulate the API response structure
    const apiResponse = {
      success: true,
      data: settings
    };
    
    console.log('📋 API Response Structure:', JSON.stringify(apiResponse, null, 2));
    
    // Test the frontend's expected path
    if (apiResponse.data && apiResponse.data.shiftSettings && apiResponse.data.shiftSettings.shiftTimes) {
      console.log('🎯 Frontend will receive shift times:', apiResponse.data.shiftSettings.shiftTimes);
    } else {
      console.log('❌ Frontend path apiResponse.data.shiftSettings.shiftTimes is undefined');
      console.log('Available paths in response.data:');
      if (apiResponse.data) {
        Object.keys(apiResponse.data).forEach(key => {
          console.log(`  - response.data.${key}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testNotificationAPI();