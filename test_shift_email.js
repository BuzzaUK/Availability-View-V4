const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');
const reportService = require('./src/backend/services/reportService');

(async () => {
  try {
    console.log('📧 TESTING SHIFT EMAIL FUNCTIONALITY');
    console.log('=' .repeat(50));
    
    // 1. Check current shift
    console.log('\n📊 CURRENT SHIFT STATUS:');
    const currentShift = await databaseService.getCurrentShift();
    if (currentShift) {
      console.log(`Active shift: ${currentShift.name} (ID: ${currentShift.id})`);
      console.log(`Started: ${new Date(currentShift.start_time).toLocaleString()}`);
    } else {
      console.log('No active shift found');
      return;
    }
    
    // 2. Check notification settings
    console.log('\n⚙️ NOTIFICATION SETTINGS:');
    const settings = await databaseService.getNotificationSettings();
    console.log('Shift reports enabled:', settings.shiftSettings?.enabled);
    console.log('Auto-send enabled:', settings.shiftSettings?.autoSend);
    console.log('Email format:', settings.shiftSettings?.emailFormat);
    
    // 3. Check users configured for reports
    console.log('\n👥 USERS CONFIGURED FOR REPORTS:');
    const users = await databaseService.getAllUsers();
    const reportUsers = users.filter(user => user.shiftReportPreferences?.enabled);
    console.log(`Found ${reportUsers.length} users configured to receive reports:`);
    reportUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });
    
    if (reportUsers.length === 0) {
      console.log('❌ No users configured to receive shift reports!');
      return;
    }
    
    // 4. Test direct report generation
    console.log('\n📄 TESTING DIRECT REPORT GENERATION:');
    const recipients = reportUsers.map(user => user.email);
    console.log(`Recipients: ${recipients.join(', ')}`);
    
    try {
      const result = await reportService.saveAndSendReport(currentShift.id, recipients, {
        includeCsv: true,
        includeHtml: true,
        includeAnalysis: true
      });
      
      console.log('✅ Report generation result:', result ? 'SUCCESS' : 'FAILED');
      
      if (result && result.filePath) {
        console.log(`📁 Report saved to: ${result.filePath}`);
      }
      
    } catch (reportError) {
      console.error('❌ Report generation failed:', reportError.message);
      console.error('Stack:', reportError.stack);
    }
    
    // 5. Test full shift change process
    console.log('\n🔄 TESTING FULL SHIFT CHANGE PROCESS:');
    console.log('This will end the current shift and start a new one...');
    
    try {
      await shiftScheduler.handleAutomaticShiftChange();
      console.log('✅ Automatic shift change completed');
      
      // Check for new shift
      const newShift = await databaseService.getCurrentShift();
      if (newShift && newShift.id !== currentShift.id) {
        console.log(`✅ New shift started: ${newShift.name} (ID: ${newShift.id})`);
      }
      
    } catch (shiftError) {
      console.error('❌ Shift change failed:', shiftError.message);
      console.error('Stack:', shiftError.stack);
    }
    
    // 6. Check for generated reports
    console.log('\n📁 CHECKING GENERATED REPORTS:');
    const fs = require('fs');
    const path = require('path');
    const reportsDir = path.join(__dirname, 'reports');
    
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      const csvFiles = files.filter(f => f.endsWith('.csv')).sort();
      console.log(`Total CSV reports: ${csvFiles.length}`);
      
      if (csvFiles.length > 0) {
        console.log('Latest reports:');
        csvFiles.slice(-3).forEach(file => {
          const filePath = path.join(reportsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`  - ${file} (${stats.size} bytes, ${stats.mtime.toLocaleString()})`);
        });
      }
    } else {
      console.log('Reports directory does not exist');
    }
    
    console.log('\n✅ SHIFT EMAIL TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
})();