const sendEmail = require('./src/backend/utils/sendEmail');

(async () => {
  try {
    console.log('🔍 FINAL EMAIL TEST');
    console.log('=' .repeat(30));
    
    console.log('\n📤 SENDING TEST EMAIL...');
    console.log('To: brr482@aol.com');
    console.log('Subject: Final Test Email');
    
    const result = await sendEmail({
      to: 'brr482@aol.com',
      subject: 'Final Test Email - ' + new Date().toLocaleString(),
      text: 'This is a final test email to verify the email functionality is working correctly with database configuration.',
      html: `
        <h2>✅ Final Test Email</h2>
        <p>This is a <strong>final test email</strong> sent at ${new Date().toLocaleString()} to verify that the email functionality is working correctly with database configuration.</p>
        <p>If you receive this email, the shift report emails should now work properly!</p>
      `
    });
    
    console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', result.messageId);
    console.log('\n🎉 Email functionality is now working with database configuration!');
    
  } catch (error) {
    console.error('\n❌ EMAIL SENDING FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
})();