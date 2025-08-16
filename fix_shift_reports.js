const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

(async () => {
  try {
    console.log('🔧 FIXING SHIFT REPORT CONFIGURATION');
    console.log('=' .repeat(50));
    
    // 1. Check current notification settings
    console.log('\n📋 CURRENT NOTIFICATION SETTINGS:');
    const settings = await databaseService.getNotificationSettings();
    console.log('Shift settings enabled:', settings.shiftSettings?.enabled);
    console.log('Auto-send enabled:', settings.shiftSettings?.autoSend);
    console.log('Shift times:', settings.shiftSettings?.shiftTimes);
    
    // 2. Ensure shift reports are properly enabled
    if (!settings.shiftSettings?.enabled || !settings.shiftSettings?.autoSend) {
      console.log('\n🔧 ENABLING SHIFT REPORTS:');
      settings.shiftSettings = {
        ...settings.shiftSettings,
        enabled: true,
        autoSend: true,
        emailFormat: 'pdf'
      };
      
      await databaseService.updateNotificationSettings(settings);
      console.log('✅ Shift reports enabled');
    }
    
    // 3. Check users and their report preferences
    console.log('\n👥 CHECKING USER REPORT PREFERENCES:');
    const users = await databaseService.getAllUsers();
    console.log(`Found ${users.length} users:`);
    
    for (const user of users) {
      console.log(`  - ${user.name} (${user.email}):`);
      console.log(`    Receive reports: ${user.shiftReportPreferences?.enabled || false}`);
      console.log(`    Email format: ${user.shiftReportPreferences?.emailFormat || 'not set'}`);
    }
    
    // 4. Find admin user and enable shift reports
    const adminUser = users.find(u => u.email === 'admin@example.com');
    if (adminUser) {
      console.log('\n🔧 CONFIGURING ADMIN USER FOR SHIFT REPORTS:');
      
      // Update admin user to receive shift reports
      await databaseService.updateUser(adminUser.id, {
        shiftReportPreferences: {
          enabled: true,
          emailFormat: 'pdf',
          shifts: settings.shiftSettings.shiftTimes || ['06:00', '14:00', '22:00']
        }
      });
      
      console.log('✅ Admin user configured to receive shift reports');
    }
    
    // 5. Add brr482@aol.com user if it doesn't exist
    const targetEmail = 'brr482@aol.com';
    let targetUser = users.find(u => u.email === targetEmail);
    
    if (!targetUser) {
      console.log(`\n👤 CREATING USER FOR ${targetEmail}:`);
      
      targetUser = await databaseService.createUser({
        name: 'Report Recipient',
        email: targetEmail,
        password: 'tempPassword123', // Should be changed on first login
        role: 'viewer',
        shiftReportPreferences: {
          enabled: true,
          emailFormat: 'pdf',
          shifts: settings.shiftSettings.shiftTimes || ['06:00', '14:00', '22:00']
        }
      });
      
      console.log('✅ User created and configured for shift reports');
    } else {
      console.log(`\n🔧 UPDATING EXISTING USER ${targetEmail}:`);
      
      await databaseService.updateUser(targetUser.id, {
        shiftReportPreferences: {
          enabled: true,
          emailFormat: 'pdf',
          shifts: settings.shiftSettings.shiftTimes || ['06:00', '14:00', '22:00']
        }
      });
      
      console.log('✅ User updated to receive shift reports');
    }
    
    // 6. Test the configuration
    console.log('\n🧪 TESTING SHIFT REPORT CONFIGURATION:');
    
    // Get current shift
    const currentShift = await databaseService.getCurrentShift();
    if (currentShift) {
      console.log(`Current shift: ${currentShift.name} (ID: ${currentShift.id})`);
      
      // Test report generation
      console.log('\n📊 TESTING MANUAL SHIFT END AND REPORT GENERATION:');
      await shiftScheduler.handleAutomaticShiftChange();
      console.log('✅ Manual shift change completed');
      
      // Check for new reports
      console.log('\n📄 CHECKING FOR NEW REPORTS:');
      const fs = require('fs');
      const path = require('path');
      const reportsDir = path.join(__dirname, 'reports');
      
      if (fs.existsSync(reportsDir)) {
        const files = fs.readdirSync(reportsDir);
        const csvFiles = files.filter(f => f.endsWith('.csv'));
        console.log(`CSV reports found: ${csvFiles.length}`);
        csvFiles.slice(-3).forEach(file => console.log(`  - ${file}`));
      }
      
    } else {
      console.log('No active shift found');
    }
    
    console.log('\n✅ SHIFT REPORT CONFIGURATION COMPLETE');
    console.log('\nNext steps:');
    console.log('1. Shift reports will be automatically generated when shifts end');
    console.log('2. Reports will be sent to configured users via email');
    console.log('3. CSV files will be saved to the reports directory');
    
  } catch (error) {
    console.error('❌ Error fixing shift report configuration:', error.message);
    console.error(error.stack);
  }
})();