const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');
const sendEmail = require('./src/backend/utils/sendEmail');

(async () => {
  try {
    console.log('🔍 SIMPLE EMAIL TEST');
    console.log('=' .repeat(30));
    
    // 1. Check email configuration
    console.log('\n📧 EMAIL CONFIGURATION:');
    const settings = await databaseService.getNotificationSettings();
    console.log('Email settings:', JSON.stringify(settings.emailSettings, null, 2));
    
    // 2. Check users
    console.log('\n👥 USERS:');
    const users = await databaseService.getAllUsers();
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Reports: ${user.shiftReportPreferences?.enabled || false}`);
    });
    
    // 3. Test direct email sending
    console.log('\n📤 TESTING DIRECT EMAIL:');
    const testRecipient = 'brr482@aol.com';
    
    try {
      const emailResult = await sendEmail({
        to: testRecipient,
        subject: 'Test Email from Shift System',
        text: 'This is a test email to verify email functionality is working.',
        html: '<p>This is a <strong>test email</strong> to verify email functionality is working.</p>'
      });
      
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', emailResult.messageId);
      
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      
      // Check if it's a configuration issue
      if (emailError.message.includes('Invalid login') || emailError.message.includes('authentication')) {
        console.log('💡 This appears to be an email authentication issue.');
        console.log('💡 Check your email settings in the notification configuration.');
      }
    }
    
    // 4. Check current shift for report generation
    console.log('\n📊 CURRENT SHIFT:');
    const currentShift = await databaseService.getCurrentShift();
    if (currentShift) {
      console.log(`Active shift: ${currentShift.shift_name} (ID: ${currentShift.id})`);
      
      // Test report generation without email
      console.log('\n📄 TESTING REPORT GENERATION (NO EMAIL):');
      try {
        const reportResult = await reportService.generateShiftReport(currentShift.id, {
          includeCsv: true,
          includeHtml: false,
          includeAnalysis: false
        });
        
        console.log('✅ Report generated successfully!');
        console.log('Report path:', reportResult.filePath);
        
      } catch (reportError) {
        console.error('❌ Report generation failed:', reportError.message);
      }
    } else {
      console.log('No active shift found');
    }
    
    console.log('\n✅ SIMPLE EMAIL TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
})();