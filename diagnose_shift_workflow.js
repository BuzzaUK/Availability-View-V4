const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

(async () => {
  try {
    console.log('🔍 DIAGNOSING SHIFT WORKFLOW');
    console.log('=' .repeat(50));
    
    // 1. Check current shift
    console.log('\n📊 CURRENT SHIFT STATUS:');
    const currentShift = await databaseService.getCurrentShift();
    if (currentShift) {
      console.log(`Active shift: ${currentShift.name || currentShift.shift_name} (ID: ${currentShift.id})`);
      console.log(`Started: ${new Date(currentShift.start_time).toLocaleString()}`);
      console.log(`Status: ${currentShift.status}`);
    } else {
      console.log('No active shift found');
    }
    
    // 2. Check notification settings
    console.log('\n⚙️ NOTIFICATION SETTINGS:');
    const settings = await databaseService.getNotificationSettings();
    console.log('Shift reports enabled:', settings.shiftSettings?.enabled);
    console.log('Auto-send enabled:', settings.shiftSettings?.autoSend);
    console.log('Email format:', settings.shiftSettings?.emailFormat);
    console.log('Shift times:', settings.shiftSettings?.shiftTimes);
    
    // 3. Check users configured for reports
    console.log('\n👥 USERS CONFIGURED FOR REPORTS:');
    const users = await databaseService.getAllUsers();
    const reportUsers = users.filter(user => user.shiftReportPreferences?.enabled);
    console.log(`Found ${reportUsers.length} users configured to receive reports:`);
    
    reportUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
      console.log(`    Format: ${user.shiftReportPreferences?.emailFormat || 'default'}`);
      console.log(`    Shifts: ${user.shiftReportPreferences?.shifts?.join(', ') || 'all'}`);
    });
    
    if (reportUsers.length === 0) {
      console.log('\n❌ NO USERS CONFIGURED FOR SHIFT REPORTS!');
      console.log('This is likely why reports are not being sent.');
    }
    
    // 4. Check email settings
    console.log('\n📧 EMAIL CONFIGURATION:');
    const emailSettings = settings.emailSettings;
    console.log('SMTP Server:', emailSettings?.smtpServer || 'Not configured');
    console.log('Port:', emailSettings?.port || 'Not configured');
    console.log('Username:', emailSettings?.username ? '***configured***' : 'Not configured');
    console.log('Password:', emailSettings?.password ? '***configured***' : 'Not configured');
    console.log('From Email:', emailSettings?.fromEmail || 'Not configured');
    
    // 5. Check recent events
    console.log('\n📋 RECENT EVENTS:');
    const eventsResult = await databaseService.getAllEvents({ limit: 10 });
    const recentEvents = eventsResult.rows || eventsResult;
    console.log(`Found ${recentEvents.length} recent events`);
    
    if (recentEvents.length > 0) {
      recentEvents.slice(0, 5).forEach(event => {
        console.log(`  - ${event.event_type}: ${event.asset?.name || event.asset_name} at ${new Date(event.timestamp).toLocaleString()}`);
      });
    }
    
    // 6. Check archived shifts
    console.log('\n📦 ARCHIVED SHIFTS:');
    try {
      const allArchives = await databaseService.getAllArchives();
      const archivedShifts = allArchives.filter(archive => 
        archive.archive_type === 'SHIFT_DATA' || archive.archive_type === 'SHIFT_REPORT'
      ).slice(0, 5);
      
      if (archivedShifts && archivedShifts.length > 0) {
        console.log(`Found ${archivedShifts.length} archived shifts (showing first 5):`);
        archivedShifts.forEach((archive, index) => {
          console.log(`  ${index + 1}. ${archive.title} (ID: ${archive.id})`);
          console.log(`     Created: ${new Date(archive.created_at).toLocaleString()}`);
          console.log(`     Type: ${archive.archive_type}`);
          if (archive.archived_data && archive.archived_data.event_count) {
            console.log(`     Events: ${archive.archived_data.event_count}`);
          }
        });
      } else {
        console.log('No archived shifts found');
      }
    } catch (error) {
      console.error('❌ Error retrieving archived shifts:', error.message);
    }
    
    // 7. Summary and recommendations
    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    
    if (!settings.shiftSettings?.enabled) {
      console.log('❌ Shift settings are DISABLED - this prevents automatic shift changes');
    }
    
    if (!settings.shiftSettings?.autoSend) {
      console.log('❌ Auto-send is DISABLED - reports won\'t be sent automatically');
    }
    
    if (reportUsers.length === 0) {
      console.log('❌ NO users configured for shift reports - no one will receive emails');
    }
    
    if (!emailSettings?.smtpServer || !emailSettings?.username) {
      console.log('❌ Email settings incomplete - emails cannot be sent');
    }
    
    if (!currentShift) {
      console.log('⚠️ No active shift - end-of-shift process cannot run');
    }
    
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
})();