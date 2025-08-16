const databaseService = require('./src/backend/services/databaseService');

async function testUserManagementFlow() {
  console.log('🔍 Testing User Management Flow...');
  
  try {
    // 1. Check what's in the database
    console.log('\n1. Checking database shift times:');
    const settings = await databaseService.getNotificationSettings();
    console.log('Database shift times:', settings.shiftSettings?.shiftTimes);
    console.log('Full settings structure:', JSON.stringify(settings, null, 2));
    
    // 2. Check what the API should return
    console.log('\n2. What the API /api/notifications/settings should return:');
    console.log('Expected response structure:');
    console.log('response.data.shiftSettings.shiftTimes =', settings.shiftSettings?.shiftTimes);
    
    // 3. Check if there are any users in the database
    console.log('\n3. Checking users in database:');
    const users = await databaseService.getAllUsers();
    console.log('Number of users:', users.length);
    if (users.length > 0) {
      console.log('First user:', {
        name: users[0].name,
        email: users[0].email,
        role: users[0].role,
        hasShiftPreferences: !!users[0].shiftReportPreferences
      });
    }
    
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Backend server is running on port 5000 ✅');
    console.log('2. Log in to the frontend application');
    console.log('3. Navigate to User Management');
    console.log('4. Check browser console for these debug logs:');
    console.log('   - "🔍 Starting fetchShiftTimes..."');
    console.log('   - "✅ Fetched shift times response:"');
    console.log('   - "🔍 Opening edit dialog for user:"');
    console.log('   - "🔍 Available shift times when opening dialog:"');
    console.log('5. If no logs appear, the fetchShiftTimes function is not being called');
    console.log('6. If logs show empty shift times, there\'s an authentication issue');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserManagementFlow().catch(console.error);