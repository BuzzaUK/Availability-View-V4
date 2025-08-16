const databaseService = require('./src/backend/services/databaseService');

async function definitiveCleanup() {
    console.log('🎯 DEFINITIVE USER ACCOUNT CLEANUP');
    console.log('=' .repeat(50));
    
    try {
        // Get all users
        const users = await databaseService.getAllUsers();
        
        console.log('\n📊 Current state:');
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})`);
        });
        
        // Find the correct Simon Test User (with brr482@aol.com)
        const correctSimon = users.find(user => 
            user.name === 'Simon Test User' && user.email === 'brr482@aol.com'
        );
        
        if (!correctSimon) {
            console.log('\n❌ Correct Simon Test User (brr482@aol.com) not found!');
            return;
        }
        
        console.log('\n✅ Correct Simon Test User identified:');
        console.log(`   ID: ${correctSimon.id}, Email: ${correctSimon.email}`);
        
        // Find ALL other Simon Test User accounts
        const duplicateSimons = users.filter(user => 
            user.name === 'Simon Test User' && user.id !== correctSimon.id
        );
        
        console.log(`\n🗑️  Found ${duplicateSimons.length} duplicate(s) to remove:`);
        for (const duplicate of duplicateSimons) {
            console.log(`   - ID: ${duplicate.id}, Email: ${duplicate.email}`);
        }
        
        // Delete all duplicates using databaseService
        for (const duplicate of duplicateSimons) {
            console.log(`\n🗑️  Deleting duplicate ID: ${duplicate.id}...`);
            try {
                await databaseService.deleteUser(duplicate.id);
                console.log(`✅ Successfully deleted ID: ${duplicate.id}`);
            } catch (error) {
                console.log(`❌ Error deleting ID ${duplicate.id}: ${error.message}`);
            }
        }
        
        // Final verification - get fresh data
        console.log('\n🔍 Final verification...');
        const finalUsers = await databaseService.getAllUsers();
        
        console.log('\n📊 FINAL STATE:');
        console.log('=' .repeat(30));
        finalUsers.forEach((user, index) => {
            const marker = user.name === 'Simon Test User' ? ' ⭐ (SIMON)' : '';
            console.log(`${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})${marker}`);
        });
        
        // Verify Simon Test User count
        const finalSimons = finalUsers.filter(user => user.name === 'Simon Test User');
        
        console.log('\n🎯 FINAL VERIFICATION:');
        console.log(`   Total accounts: ${finalUsers.length}`);
        console.log(`   Simon Test Users: ${finalSimons.length}`);
        
        if (finalSimons.length === 1) {
            const simon = finalSimons[0];
            console.log('\n✅ SUCCESS! Single Simon Test User confirmed:');
            console.log(`   📛 Name: ${simon.name}`);
            console.log(`   📧 Email: ${simon.email}`);
            console.log(`   🆔 ID: ${simon.id}`);
            
            if (simon.email === 'brr482@aol.com') {
                console.log('\n🎉 PERFECT! Email matches the provided image.');
                console.log('✅ Account consolidation COMPLETED successfully!');
            } else {
                console.log('\n⚠️  Email does not match expected: brr482@aol.com');
            }
        } else {
            console.log('\n❌ FAILED: Expected 1 Simon Test User, found ' + finalSimons.length);
        }
        
        console.log('\n' + '=' .repeat(50));
        console.log('🏁 DEFINITIVE CLEANUP COMPLETE');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Execute cleanup
definitiveCleanup();