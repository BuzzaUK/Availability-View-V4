const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const databaseService = require('./src/backend/services/databaseService');

async function checkNotificationSettings() {
  try {
    console.log('🔍 Checking current notification settings...');
    
    const settings = await databaseService.getNotificationSettings();
    
    console.log('\n📋 CURRENT NOTIFICATION SETTINGS:');
    console.log('================================');
    console.log('Shift Settings Enabled:', settings?.shiftSettings?.enabled);
    console.log('Auto-Send Enabled:', settings?.shiftSettings?.autoSend);
    console.log('Shift Times:', settings?.shiftSettings?.shiftTimes);
    console.log('Email Format:', settings?.shiftSettings?.emailFormat);
    
    console.log('\n📧 EMAIL SETTINGS:');
    console.log('==================');
    console.log('SMTP Server:', settings?.emailSettings?.smtpServer || 'Not configured');
    console.log('Port:', settings?.emailSettings?.port || 'Not configured');
    console.log('Username:', settings?.emailSettings?.username || 'Not configured');
    console.log('From Email:', settings?.emailSettings?.fromEmail || 'Not configured');
    
    if (!settings?.shiftSettings?.enabled || !settings?.shiftSettings?.autoSend) {
      console.log('\n⚠️  ISSUE IDENTIFIED:');
      console.log('===================');
      if (!settings?.shiftSettings?.enabled) {
        console.log('❌ Shift settings are DISABLED');
      }
      if (!settings?.shiftSettings?.autoSend) {
        console.log('❌ Auto-send is DISABLED');
      }
      
      console.log('\n🔧 FIXING SETTINGS...');
      
      const updatedSettings = {
        ...settings,
        shiftSettings: {
          ...settings?.shiftSettings,
          enabled: true,
          autoSend: true,
          shiftTimes: settings?.shiftSettings?.shiftTimes || ['08:00', '16:00', '00:00'],
          emailFormat: 'pdf'
        }
      };
      
      await databaseService.updateNotificationSettings(updatedSettings);
      console.log('✅ Notification settings updated successfully!');
      
      // Verify the update
      const verifySettings = await databaseService.getNotificationSettings();
      console.log('\n✅ VERIFIED SETTINGS:');
      console.log('Shift Settings Enabled:', verifySettings?.shiftSettings?.enabled);
      console.log('Auto-Send Enabled:', verifySettings?.shiftSettings?.autoSend);
    } else {
      console.log('\n✅ Notification settings are properly configured!');
    }
    
    console.log('\n✅ Notification settings check completed successfully');
    
  } catch (error) {
    console.error('❌ Error checking notification settings:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkNotificationSettings().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});