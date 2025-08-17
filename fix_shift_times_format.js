const databaseService = require('./src/backend/services/databaseService');
const { sequelize } = require('./src/backend/config/database');

/**
 * Fix shift times format mismatch issue
 * Database stores HHMM format but frontend expects HH:MM format
 */
async function fixShiftTimesFormat() {
  try {
    console.log('🔍 Investigating shift times format issue...');
    
    // Get current notification settings
    const settings = await databaseService.getNotificationSettings();
    console.log('Current notification settings:', JSON.stringify(settings, null, 2));
    
    if (settings && settings.shiftSettings && settings.shiftSettings.shiftTimes) {
      const currentShiftTimes = settings.shiftSettings.shiftTimes;
      console.log('Current shift times:', currentShiftTimes);
      
      // Check if shift times are in HHMM format (need conversion to HH:MM)
      const needsConversion = currentShiftTimes.some(time => 
        typeof time === 'string' && 
        time.length === 4 && 
        !time.includes(':') &&
        /^\d{4}$/.test(time)
      );
      
      if (needsConversion) {
        console.log('⚠️  Shift times are in HHMM format, converting to HH:MM...');
        
        // Convert HHMM to HH:MM format
        const convertedShiftTimes = currentShiftTimes.map(time => {
          if (typeof time === 'string' && time.length === 4 && !time.includes(':')) {
            const hours = time.substring(0, 2);
            const minutes = time.substring(2, 4);
            return `${hours}:${minutes}`;
          }
          return time; // Already in correct format
        });
        
        console.log('Converted shift times:', convertedShiftTimes);
        
        // Update the settings with converted format
        const updatedSettings = {
          ...settings,
          shiftSettings: {
            ...settings.shiftSettings,
            shiftTimes: convertedShiftTimes
          }
        };
        
        // Save updated settings
        await databaseService.updateNotificationSettings(updatedSettings);
        console.log('✅ Shift times format updated successfully!');
        
        // Verify the update
        const verifySettings = await databaseService.getNotificationSettings();
        console.log('Verified updated shift times:', verifySettings.shiftSettings.shiftTimes);
        
      } else {
        console.log('✅ Shift times are already in correct HH:MM format');
      }
    } else {
      console.log('⚠️  No shift times found in notification settings');
      
      // Set default shift times in HH:MM format
      const defaultSettings = {
        autoRefresh: true,
        refreshInterval: 30,
        shiftSettings: {
          shiftTimes: ['06:00', '14:00', '22:00']
        }
      };
      
      await databaseService.updateNotificationSettings(defaultSettings);
      console.log('✅ Default shift times set in HH:MM format');
    }
    
    // Test API endpoints to ensure they return correct format
    console.log('\n🧪 Testing API endpoints...');
    
    const axios = require('axios');
    const baseURL = 'http://localhost:5000';
    
    try {
      // Test /api/settings/notifications
      const response1 = await axios.get(`${baseURL}/api/settings/notifications`);
      console.log('/api/settings/notifications response structure:');
      console.log('- shiftTimes path 1:', response1.data?.shiftSettings?.shiftTimes);
      console.log('- shiftTimes path 2:', response1.data?.data?.shiftSettings?.shiftTimes);
      
      // Test /api/notifications/settings  
      const response2 = await axios.get(`${baseURL}/api/notifications/settings`);
      console.log('/api/notifications/settings response structure:');
      console.log('- shiftTimes path 1:', response2.data?.shiftSettings?.shiftTimes);
      console.log('- shiftTimes path 2:', response2.data?.data?.shiftSettings?.shiftTimes);
      
    } catch (apiError) {
      console.log('⚠️  API endpoints not accessible (server may not be running)');
      console.log('Error:', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Error fixing shift times format:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixShiftTimesFormat();