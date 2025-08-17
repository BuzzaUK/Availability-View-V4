const databaseService = require('./src/backend/services/databaseService');

async function testNotificationSettingsStructure() {
  try {
    console.log('🔍 Testing notification settings structure after database patch...');
    
    const settings = await databaseService.getNotificationSettings();
    
    console.log('\n📋 Full notification settings:');
    console.log(JSON.stringify(settings, null, 2));
    
    console.log('\n🎯 Shift settings analysis:');
    console.log('- settings exists:', !!settings);
    console.log('- settings.shiftSettings exists:', !!settings?.shiftSettings);
    console.log('- settings.shiftSettings.shiftTimes exists:', !!settings?.shiftSettings?.shiftTimes);
    console.log('- shiftTimes value:', settings?.shiftSettings?.shiftTimes);
    console.log('- shiftTimes type:', typeof settings?.shiftSettings?.shiftTimes);
    console.log('- shiftTimes is array:', Array.isArray(settings?.shiftSettings?.shiftTimes));
    console.log('- shiftTimes length:', settings?.shiftSettings?.shiftTimes?.length || 0);
    
    // Test API response structure simulation
    console.log('\n🌐 API Response Structure Simulation:');
    
    // /api/settings/notifications response (direct settings)
    console.log('\n1. /api/settings/notifications response:');
    console.log('   response.data =', JSON.stringify(settings, null, 2));
    console.log('   response.data.shiftSettings.shiftTimes =', settings?.shiftSettings?.shiftTimes);
    
    // /api/notifications/settings response (wrapped in success/data)
    const wrappedResponse = {
      success: true,
      data: settings
    };
    console.log('\n2. /api/notifications/settings response:');
    console.log('   response.data =', JSON.stringify(wrappedResponse, null, 2));
    console.log('   response.data.data.shiftSettings.shiftTimes =', wrappedResponse?.data?.shiftSettings?.shiftTimes);
    
    // Test frontend access patterns
    console.log('\n🔍 Frontend Access Pattern Test:');
    const mockResponse1 = { data: settings };
    const mockResponse2 = { data: wrappedResponse };
    
    console.log('\nPattern 1 (direct): response.data.shiftSettings.shiftTimes');
    const pattern1 = mockResponse1?.data?.shiftSettings?.shiftTimes;
    console.log('   Result:', pattern1);
    console.log('   Valid:', Array.isArray(pattern1) && pattern1.length > 0);
    
    console.log('\nPattern 2 (wrapped): response.data.data.shiftSettings.shiftTimes');
    const pattern2 = mockResponse2?.data?.data?.shiftSettings?.shiftTimes;
    console.log('   Result:', pattern2);
    console.log('   Valid:', Array.isArray(pattern2) && pattern2.length > 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testNotificationSettingsStructure();