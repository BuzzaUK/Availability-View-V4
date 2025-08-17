const databaseService = require('./src/backend/services/databaseService');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function updateUserEmail() {
    try {
        // Wait for database to be ready
        while (!databaseService.initialized) {
            console.log('Waiting for database to initialize...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('Database ready!');
        console.log('\nCurrent users configured to receive reports:');
        
        const users = await databaseService.getAllUsers();
        const reportUsers = users.filter(user => 
            user.receive_reports || (user.shiftReportPreferences && user.shiftReportPreferences.enabled)
        );
        
        reportUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email})`);
        });
        
        rl.question('\nWhich user would you like to update? (enter number): ', async (userIndex) => {
            const selectedUser = reportUsers[parseInt(userIndex) - 1];
            if (!selectedUser) {
                console.log('Invalid selection!');
                rl.close();
                process.exit(1);
            }
            
            console.log(`Selected: ${selectedUser.name} (${selectedUser.email})`);
            
            rl.question('Enter the new email address: ', async (newEmail) => {
                try {
                    await databaseService.updateUser(selectedUser.id, { email: newEmail });
                    console.log(`\n✅ Successfully updated ${selectedUser.name}'s email to: ${newEmail}`);
                    console.log('\nYou should now receive shift report emails at this address.');
                } catch (error) {
                    console.error('❌ Error updating email:', error.message);
                }
                
                rl.close();
                process.exit(0);
            });
        });
        
    } catch (error) {
        console.error('Error:', error);
        rl.close();
        process.exit(1);
    }
}

updateUserEmail();