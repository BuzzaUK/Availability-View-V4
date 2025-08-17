const databaseService = require('./src/backend/services/databaseService');

async function checkUserEmails() {
    try {
        // Wait for database to be ready
        while (!databaseService.initialized) {
            console.log('Waiting for database to initialize...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('Database ready, checking users...');
        const users = await databaseService.getAllUsers();
        
        console.log('\nUsers configured to receive reports:');
        let foundRecipients = false;
        
        users.forEach(user => {
            if (user.receive_reports || (user.shiftReportPreferences && user.shiftReportPreferences.enabled)) {
                console.log(`- ${user.name} (${user.email})`);
                console.log(`  receive_reports: ${user.receive_reports}`);
                console.log(`  shiftReportPreferences: ${JSON.stringify(user.shiftReportPreferences)}`);
                foundRecipients = true;
            }
        });
        
        if (!foundRecipients) {
            console.log('No users found with report preferences enabled!');
            console.log('\nAll users in database:');
            users.forEach(user => {
                console.log(`- ${user.name} (${user.email}) - receive_reports: ${user.receive_reports}`);
            });
        }
        
    } catch (error) {
        console.error('Error checking users:', error);
    }
    
    process.exit(0);
}

checkUserEmails();