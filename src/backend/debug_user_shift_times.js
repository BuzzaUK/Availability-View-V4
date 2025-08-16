// Debug script to check shift times for User Management
const databaseService = require('./services/databaseService');

async function debugUserShiftTimes() {
  try {
    console.log('🔍 DEBUGGING USER MANAGEMENT SHIFT TIMES');
    console.log('=' .repeat(50));
    
    // 1. Check database directly
    console.log('\n📋 CHECKING DATABASE DIRECTLY:');
    const settings = await databaseService.getNotificationSettings();
    console.log('Shift settings:', JSON.stringify(settings.shiftSettings, null, 2));
    console.log('Shift times from DB:', settings.shiftSettings?.shiftTimes);
    
    // 2. Test the API endpoint that User Management uses
    console.log('\n🌐 TESTING API ENDPOINT:');
    try {
      // Simulate the API response structure
      const apiResponse = {
        success: true,
        data: settings
      };
      
      console.log('API Response structure:', JSON.stringify(apiResponse, null, 2));
      console.log('Path check - response.data.data.shiftSettings.shiftTimes:', apiResponse.data?.shiftSettings?.shiftTimes);
      
    } catch (apiError) {
      console.error('API test failed:', apiError.message);
    }
    
    // 3. Check if there are any users with old shift preferences
    console.log('\n👥 CHECKING USER SHIFT PREFERENCES:');
    const users = await databaseService.getAllUsers();
    
    for (const user of users) {
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`  shiftReportPreferences:`, user.shiftReportPreferences);
      console.log(`  shiftReportPreferences type:`, typeof user.shiftReportPreferences);
      
      if (user.shiftReportPreferences?.shifts && user.shiftReportPreferences.shifts.length > 0) {
        console.log(`  Configured shifts: ${JSON.stringify(user.shiftReportPreferences.shifts)}`);
        
        // Check if any of these shifts don't match current notification settings
        const currentShiftTimes = settings.shiftSettings?.shiftTimes || [];
        const userShifts = user.shiftReportPreferences.shifts;
        const invalidShifts = userShifts.filter(shift => !currentShiftTimes.includes(shift));
        
        if (invalidShifts.length > 0) {
          console.log(`  ⚠️  Invalid shifts (not in notification settings): ${JSON.stringify(invalidShifts)}`);
        }
      } else {
        console.log(`  No shift preferences configured`);
      }
    }
    
    // 4. Check for any legacy shift data in database
    console.log('\n🔍 CHECKING FOR LEGACY SHIFT DATA:');
    const { sequelize } = require('./config/database');
    
    try {
      // Check if there's a shifts table with old data
      const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='shifts';");
      
      if (results.length > 0) {
        console.log('Found shifts table, checking contents...');
        const [shiftData] = await sequelize.query('SELECT * FROM shifts;');
        console.log('Legacy shifts data:', shiftData);
      } else {
        console.log('No legacy shifts table found');
      }
    } catch (dbError) {
      console.log('Database query error (expected if no shifts table):', dbError.message);
    }
    
    console.log('\n✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

debugUserShiftTimes();