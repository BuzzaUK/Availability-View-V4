const databaseService = require('./src/backend/services/databaseService');

async function verifyUserAccounts() {
    console.log('🔍 VERIFYING USER ACCOUNTS IN DATABASE');
    console.log('=' .repeat(50));
    
    try {
        // Get all users from the database
        console.log('\n📊 Retrieving all user accounts...');
        const users = await databaseService.getAllUsers();
        
        console.log(`\n👥 Total User Accounts Found: ${users.length}`);
        console.log('=' .repeat(50));
        
        // Display each user account
        users.forEach((user, index) => {
            console.log(`\n${index + 1}. User Account Details:`);
            console.log(`   📛 Name: ${user.name || 'N/A'}`);
            console.log(`   📧 Email: ${user.email || 'N/A'}`);
            console.log(`   🆔 ID: ${user.id}`);
            console.log(`   👤 Role: ${user.role || 'N/A'}`);
            console.log(`   ✅ Active: ${user.isActive ? 'Yes' : 'No'}`);
            console.log(`   📅 Created: ${user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}`);
            console.log(`   🔄 Updated: ${user.updated_at ? new Date(user.updated_at).toLocaleString() : 'N/A'}`);
        });
        
        console.log('\n' + '=' .repeat(50));
        
        // Check for Simon Test User specifically
        const simonUsers = users.filter(user => 
            user.name && user.name.toLowerCase().includes('simon') && 
            user.name.toLowerCase().includes('test')
        );
        
        console.log(`\n🎯 Simon Test User Analysis:`);
        if (simonUsers.length === 0) {
            console.log('   ❌ No Simon Test User found');
        } else if (simonUsers.length === 1) {
            const simon = simonUsers[0];
            console.log('   ✅ Single Simon Test User found:');
            console.log(`      📛 Name: ${simon.name}`);
            console.log(`      📧 Email: ${simon.email}`);
            console.log(`      🆔 ID: ${simon.id}`);
        } else {
            console.log(`   ⚠️  Multiple Simon Test Users found (${simonUsers.length}):`);
            simonUsers.forEach((simon, index) => {
                console.log(`      ${index + 1}. ${simon.name} (${simon.email})`);
            });
        }
        
        // Verify total account count
        console.log(`\n📊 Account Count Verification:`);
        console.log(`   Total Accounts: ${users.length}`);
        if (users.length === 2) {
            console.log('   ✅ Confirmed: Exactly 2 user accounts exist');
        } else {
            console.log(`   ⚠️  Expected 2 accounts, but found ${users.length}`);
        }
        
        console.log('\n' + '=' .repeat(50));
        console.log('✅ USER ACCOUNT VERIFICATION COMPLETE');
        
    } catch (error) {
        console.error('❌ Error verifying user accounts:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Execute the verification
verifyUserAccounts();