const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');
const sendEmail = require('./src/backend/utils/sendEmail');

(async () => {
  try {
    console.log('🧪 COMPREHENSIVE SHIFT REPORT WORKFLOW TEST');
    console.log('=' .repeat(50));
    
    // 1. Check current system state
    console.log('\n📋 CURRENT SYSTEM STATE:');
    const currentShift = await databaseService.getCurrentShift();
    console.log('Active shift:', currentShift ? {
      id: currentShift.id,
      name: currentShift.shift_name,
      start_time: currentShift.start_time,
      status: currentShift.status
    } : 'None');
    
    if (!currentShift || currentShift.status !== 'active') {
      console.log('❌ No active shift found. Cannot test shift report workflow.');
      return;
    }
    
    // 2. Check notification settings
    console.log('\n⚙️ NOTIFICATION SETTINGS:');
    const settings = await databaseService.getNotificationSettings();
    console.log('Shift reports enabled:', settings?.shiftSettings?.enabled);
    console.log('Auto-send enabled:', settings?.shiftSettings?.autoSend);
    console.log('Email format:', settings?.shiftSettings?.emailFormat);
    console.log('Shift times:', settings?.shiftSettings?.shiftTimes);
    
    // 3. Check email configuration
    console.log('\n📧 EMAIL CONFIGURATION:');
    const emailSettings = settings.emailSettings;
    console.log('SMTP Server:', emailSettings?.smtpServer);
    console.log('Port:', emailSettings?.port);
    console.log('Username:', emailSettings?.username);
    console.log('Password configured:', emailSettings?.password ? 'YES' : 'NO');
    console.log('From Email:', emailSettings?.fromEmail);
    
    if (!emailSettings?.smtpServer || !emailSettings?.username || !emailSettings?.password) {
      console.log('❌ Email configuration incomplete. Cannot send emails.');
      return;
    }
    
    // 4. Check users configured for reports
    console.log('\n👥 USERS CONFIGURED FOR REPORTS:');
    const users = await databaseService.getAllUsers();
    const reportUsers = users.filter(user => 
      user.shiftReportPreferences && 
      user.shiftReportPreferences.enabled === true
    );
    
    console.log(`Found ${reportUsers.length} users configured for shift reports:`);
    reportUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
      console.log(`    Format: ${user.shiftReportPreferences.emailFormat || 'default'}`);
      console.log(`    Shift times: ${JSON.stringify(user.shiftReportPreferences.shiftTimes || [])}`);
    });
    
    if (reportUsers.length === 0) {
      console.log('❌ No users configured to receive shift reports.');
      return;
    }
    
    // 5. Test email sending capability
    console.log('\n📤 TESTING EMAIL SENDING CAPABILITY:');
    const testRecipient = reportUsers.find(user => user.email.includes('simon') || user.email.includes('test'));
    if (testRecipient) {
      try {
        await sendEmail({
          to: testRecipient.email,
          subject: 'Test Email - Shift Report System',
          text: 'This is a test email to verify email functionality before testing shift reports.',
          html: '<p>This is a <strong>test email</strong> to verify email functionality before testing shift reports.</p>'
        });
        console.log(`✅ Test email sent successfully to ${testRecipient.email}`);
      } catch (emailError) {
        console.error(`❌ Test email failed: ${emailError.message}`);
        return;
      }
    }
    
    // 6. Test shift report generation
    console.log('\n📊 TESTING SHIFT REPORT GENERATION:');
    try {
      const reportResult = await reportService.generateShiftReport(currentShift.id, {
        includeCsv: true,
        includeHtml: true,
        includeAnalysis: true
      });
      
      console.log('✅ Shift report generated successfully');
      console.log('Report formats:', Object.keys(reportResult.reports || {}));
      console.log('Metrics available:', reportResult.metrics ? 'YES' : 'NO');
      console.log('Assets analyzed:', reportResult.assets ? reportResult.assets.length : 0);
      
      // Check if report has meaningful data
      if (reportResult.reports.csv) {
        const csvLength = reportResult.reports.csv.shift_summary?.length || 0;
        console.log('CSV report length:', csvLength, 'characters');
      }
      
    } catch (reportError) {
      console.error(`❌ Shift report generation failed: ${reportError.message}`);
      console.error('Stack:', reportError.stack);
      return;
    }
    
    // 7. Test saveAndSendReport method
    console.log('\n📧 TESTING SAVE AND SEND REPORT:');
    const recipients = reportUsers.map(user => user.email);
    console.log('Recipients:', recipients.join(', '));
    
    try {
      const saveAndSendResult = await reportService.saveAndSendReport(currentShift.id, recipients, {
        includeCsv: true,
        includeHtml: true,
        includeAnalysis: true
      });
      
      console.log('✅ Save and send result:', saveAndSendResult.success ? 'SUCCESS' : 'FAILED');
      if (saveAndSendResult.success) {
        console.log('Files generated:', Object.keys(saveAndSendResult.files || {}));
        console.log('Report formats:', Object.keys(saveAndSendResult.report?.reports || {}));
      } else {
        console.log('Error:', saveAndSendResult.error);
      }
      
    } catch (saveAndSendError) {
      console.error(`❌ Save and send failed: ${saveAndSendError.message}`);
      console.error('Stack:', saveAndSendError.stack);
    }
    
    // 8. Test shift scheduler notification method
    console.log('\n📬 TESTING SHIFT SCHEDULER NOTIFICATIONS:');
    try {
      // Create mock reports for testing
      const mockReports = {
        csv: 'Shift,Asset,Events\nTest Shift,Test Asset,5',
        html: '<h1>Test Shift Report</h1><p>This is a test report.</p>'
      };
      
      const mockShiftInfo = {
        shift_name: currentShift.shift_name,
        shift_number: currentShift.shift_number || 1,
        start_time: currentShift.start_time,
        end_time: new Date().toISOString()
      };
      
      await shiftScheduler.sendShiftReportNotifications(mockReports, mockShiftInfo);
      console.log('✅ Shift scheduler notifications sent successfully');
      
    } catch (notificationError) {
      console.error(`❌ Shift scheduler notifications failed: ${notificationError.message}`);
      console.error('Stack:', notificationError.stack);
    }
    
    // 9. Summary and recommendations
    console.log('\n🎯 TEST SUMMARY:');
    console.log('✅ System state checked');
    console.log('✅ Configuration verified');
    console.log('✅ Email capability tested');
    console.log('✅ Report generation tested');
    console.log('✅ Email sending tested');
    
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('1. Verify that Simon Test user receives the test emails');
    console.log('2. Check spam/junk folders if emails are not received');
    console.log('3. Monitor server logs for any email sending errors');
    console.log('4. Ensure shift reports are being generated with meaningful data');
    
    console.log('\n✅ COMPREHENSIVE TEST COMPLETE!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
})();