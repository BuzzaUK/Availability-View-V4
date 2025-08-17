const nodemailer = require('nodemailer');
const databaseService = require('./src/backend/services/databaseService');

async function testEmailDirect() {
    try {
        console.log('=== DIRECT EMAIL TEST ===');
        
        // Get notification settings
        const settings = await databaseService.getNotificationSettings();
        console.log('Email settings loaded:', {
            enabled: settings?.channels?.email,
            host: settings?.emailSettings?.smtpServer,
            port: settings?.emailSettings?.port,
            user: settings?.emailSettings?.username
        });
        
        if (!settings?.channels?.email) {
            console.log('❌ Email is not enabled in settings');
            return;
        }
        
        // Create transporter
        const transporter = nodemailer.createTransport({
            host: settings.emailSettings.smtpServer,
            port: settings.emailSettings.port,
            secure: settings.emailSettings.port === 465, // SSL for port 465, otherwise STARTTLS
            auth: {
                user: settings.emailSettings.username,
                pass: settings.emailSettings.password
            }
        });
        
        console.log('Transporter created successfully');
        
        // Test email
        const testEmail = {
            from: settings.emailSettings.fromEmail || settings.emailSettings.username,
            to: 'admin@example.com',
            subject: 'Test Email - Direct Send',
            text: 'This is a test email to verify email functionality.',
            html: '<p>This is a test email to verify email functionality.</p>'
        };
        
        console.log('Sending test email to:', testEmail.to);
        
        const result = await transporter.sendMail(testEmail);
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', result.messageId);
        console.log('Response:', result.response);
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        if (error.response) {
            console.error('SMTP response:', error.response);
        }
    }
}

testEmailDirect().then(() => {
    console.log('Test completed');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});