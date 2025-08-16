// Test script to check if shift times are being fetched correctly
const axios = require('axios');

// Simulate the frontend API call
async function testShiftTimesFetch() {
  console.log('🔍 Testing shift times fetch from frontend perspective...');
  
  try {
    // This will fail without authentication, but we can see the structure
    const response = await axios.get('http://localhost:5000/api/notifications/settings', {
      headers: {
        'Authorization': 'Bearer fake-token' // This will fail but show us the auth error
      }
    });
    
    console.log('✅ API Response:', JSON.stringify(response.data, null, 2));
    console.log('✅ Shift times:', response.data.shiftSettings?.shiftTimes);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Status:', error.response.status);
      console.log('❌ API Error Message:', error.response.data?.message || 'Unknown error');
      
      if (error.response.status === 401) {
        console.log('\n💡 This is expected - the API requires authentication.');
        console.log('💡 The frontend should be making authenticated requests.');
        console.log('💡 Check if the user is logged in when accessing UserManagement.');
      }
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
  
  console.log('\n🔧 Troubleshooting checklist:');
  console.log('1. Is the user logged in when accessing UserManagement?');
  console.log('2. Are there any console errors in the browser?');
  console.log('3. Is the fetchShiftTimes function being called?');
  console.log('4. Is the availableShiftTimes state being set?');
  console.log('5. Is the dropdown rendering with the correct data?');
}

testShiftTimesFetch().catch(console.error);