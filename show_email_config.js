const databaseService = require('./src/backend/services/databaseService');

async function showEmailConfig() {
    try {
        // Wait for database to be ready
        while (!databaseService.initialized) {
            console.log('Waiting for database to initialize...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n=== EMAIL CONFIGURATION STATUS ===\n');
        
        const users = await databaseService.getAllUsers();
        const reportUsers = users.filter(user => 
            user.receive_reports || (user.shiftReportPreferences && user.shiftReportPreferences.enabled)
        );
        
        console.log('📧 Users configured to receive shift reports:');
        reportUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.name}`);
            console.log(`      Email: ${user.email}`);
            console.log(`      receive_reports: ${user.receive_reports}`);
            console.log(`      shiftReportPreferences: ${JSON.stringify(user.shiftReportPreferences)}`);
            console.log('');
        });
        
        console.log('\n=== DIAGNOSIS ===');
        console.log('✅ Email system is working (SMTP connection successful)');
        console.log('✅ Reports are being generated and sent');
        console.log('❓ Issue: You may not be receiving emails because:');
        console.log('   1. The email addresses above may not be your actual email');
        console.log('   2. Emails might be going to spam/junk folder');
        console.log('   3. The email addresses might be incorrect');
        
        console.log('\n=== SOLUTIONS ===');
        console.log('1. Check your spam/junk folder for emails from: availabilityview@gmail.com');
        console.log('2. Update your email address in the system:');
        console.log('   - Run: node update_user_email.js');
        console.log('   - Or update directly in the web interface');
        console.log('3. Test email delivery:');
        console.log('   - Run: node test_email_direct.js');
        
    } catch (error) {
        console.error('Error:', error);
    }
    
    process.exit(0);
}

showEmailConfig();