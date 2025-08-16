const databaseService = require('./src/backend/services/databaseService');

async function simpleUserCheck() {
    console.log('🔍 SIMPLE USER ACCOUNT VERIFICATION');
    console.log('=' .repeat(40));
    
    try {
        // Get all users from the database service
        const users = await databaseService.getAllUsers();
        
        console.log(`\n📊 Total Users Found: ${users.length}`);
        console.log('\n👥 User Accounts:');
        
        users.forEach((user, index) => {
            const isSimon = user.name === 'Simon Test User' ? ' ⭐' : '';
            console.log(`   ${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})${isSimon}`);
        });
        
        // Check for Simon Test User specifically
        const simonUsers = users.filter(user => user.name === 'Simon Test User');
        
        console.log('\n🎯 Simon Test User Analysis:');
        console.log(`   Count: ${simonUsers.length}`);
        
        if (simonUsers.length === 1) {
            const simon = simonUsers[0];
            console.log('   ✅ Single Simon Test User account confirmed');
            console.log(`   📧 Email: ${simon.email}`);
            console.log(`   🆔 ID: ${simon.id}`);
            
            if (simon.email === 'brr482@aol.com') {
                console.log('   ✅ Email matches the provided image');
            } else {
                console.log('   ❌ Email does not match expected: brr482@aol.com');
            }
        } else if (simonUsers.length === 0) {
            console.log('   ❌ No Simon Test User found');
        } else {
            console.log('   ❌ Multiple Simon Test User accounts found:');
            simonUsers.forEach((simon, index) => {
                console.log(`      ${index + 1}. ${simon.email} (ID: ${simon.id})`);
            });
        }
        
        // Final summary
        console.log('\n📋 FINAL SUMMARY:');
        console.log('=' .repeat(30));
        console.log(`✅ Total accounts: ${users.length}`);
        console.log(`✅ Simon Test User accounts: ${simonUsers.length}`);
        
        if (simonUsers.length === 1 && simonUsers[0].email === 'brr482@aol.com') {
            console.log('✅ Simon Test User email verified: brr482@aol.com');
            console.log('✅ Account consolidation SUCCESSFUL');
        } else {
            console.log('❌ Account consolidation needs attention');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Execute the check
simpleUserCheck();