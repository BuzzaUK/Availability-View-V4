const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Test the shift times database directly
async function debugShiftDropdown() {
  console.log('🔍 Debugging shift times dropdown issue...');
  
  // 1. Check database directly
  console.log('\n1. Checking database directly:');
  const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');
  const db = new sqlite3.Database(dbPath);
  
  await new Promise((resolve, reject) => {
    db.get("SELECT value FROM settings WHERE key = 'notification_settings'", (err, row) => {
      if (err) {
        console.error('Database error:', err);
        reject(err);
      } else if (row) {
        try {
          const settings = JSON.parse(row.value);
          console.log('Database notification_settings:', JSON.stringify(settings, null, 2));
          console.log('Shift times in DB:', settings.shiftSettings?.shiftTimes);
          
          // Check the structure that the frontend expects
          console.log('\n2. Expected API response structure:');
          const expectedResponse = {
            success: true,
            data: settings
          };
          console.log('Expected response.data:', JSON.stringify(expectedResponse.data, null, 2));
          console.log('Expected response.data.shiftSettings.shiftTimes:', expectedResponse.data.shiftSettings?.shiftTimes);
          
        } catch (parseErr) {
          console.error('Error parsing settings:', parseErr);
        }
      } else {
        console.log('No notification_settings found in database');
      }
      resolve();
    });
  });
  
  db.close();
  
  console.log('\n3. Troubleshooting steps:');
  console.log('- Check browser console for fetchShiftTimes debug logs');
  console.log('- Verify user is logged in when accessing UserManagement');
  console.log('- Check if availableShiftTimes state is being set correctly');
  console.log('- Ensure the Edit User dialog is properly rendering the dropdown');
  console.log('- The frontend expects: response.data.shiftSettings.shiftTimes');
}

debugShiftDropdown().catch(console.error);