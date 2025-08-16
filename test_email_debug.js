const sendEmail = require('./src/backend/utils/sendEmail');
const databaseService = require('./src/backend/services/databaseService');

(async () => {
  try {
    console.log('🔍 EMAIL DEBUG TEST');
    console.log('=' .repeat(40));
    
    // Get email settings
    const settings = await databaseService.getNotificationSettings();
    const emailSettings = settings.emailSettings;
    
    console.log('\n📧 EMAIL SETTINGS:');
    console.log('SMTP Server:', emailSettings.smtpServer);
    console.log('Port:', emailSettings.port);
    console.log('Username:', emailSettings.username);
    console.log('From Email:', emailSettings.fromEmail);
    console.log('Use TLS:', emailSettings.useTLS);
    console.log('Password configured:', emailSettings.password ? 'YES' : 'NO');
    
    console.log('\n📤 ATTEMPTING TO SEND TEST EMAIL...');
    console.log('To: brr482@aol.com');
    console.log('Subject: Test Email from Shift System');
    
    try {
      const result = await sendEmail({
        to: 'brr482@aol.com',
        subject: 'Test Email from Shift System - ' + new Date().toLocaleString(),
        text: 'This is a test email to verify the email functionality is working correctly.',
        html: `
          <h2>Test Email</h2>
          <p>This is a <strong>test email</strong> sent at ${new Date().toLocaleString()} to verify that the email functionality is working correctly.</p>
          <p>If you receive this email, the shift report email system is functioning properly.</p>
        `
      });
      
      console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
      console.log('Message ID:', result.messageId);
      console.log('Response:', result.response);
      
      if (result.accepted && result.accepted.length > 0) {
        console.log('Accepted recipients:', result.accepted.join(', '));
      }
      
      if (result.rejected && result.rejected.length > 0) {
        console.log('Rejected recipients:', result.rejected.join(', '));
      }
      
    } catch (emailError) {
      console.log('\n❌ EMAIL SENDING FAILED!');
      console.log('Error message:', emailError.message);
      console.log('Error code:', emailError.code);
      console.log('Error command:', emailError.command);
      
      // Provide specific troubleshooting based on error type
      if (emailError.message.includes('Invalid login')) {
        console.log('\n💡 TROUBLESHOOTING:');
        console.log('- This is an authentication error');
        console.log('- Check if the Gmail app password is correct');
        console.log('- Ensure 2-factor authentication is enabled on the Gmail account');
        console.log('- Verify the app password was generated correctly');
      } else if (emailError.message.includes('ECONNREFUSED')) {
        console.log('\n💡 TROUBLESHOOTING:');
        console.log('- Connection refused to SMTP server');
        console.log('- Check internet connection');
        console.log('- Verify SMTP server and port settings');
      } else if (emailError.message.includes('ETIMEDOUT')) {
        console.log('\n💡 TROUBLESHOOTING:');
        console.log('- Connection timeout');
        console.log('- Check firewall settings');
        console.log('- Try a different network');
      }
      
      console.log('\nFull error details:');
      console.log(emailError);
    }
    
    console.log('\n✅ EMAIL DEBUG TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
})();