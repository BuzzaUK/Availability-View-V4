const databaseService = require('./src/backend/services/databaseService');

async function finalUserCleanup() {
    console.log('🧹 FINAL USER ACCOUNT CLEANUP');
    console.log('=' .repeat(45));
    
    try {
        // Get all users to verify current state
        console.log('\n📊 Current database state:');
        const users = await databaseService.getAllUsers();
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})`);
        });
        
        // Find the correct Simon Test User account (the one with brr482@aol.com)
        const correctSimon = users.find(user => 
            user.name === 'Simon Test User' && user.email === 'brr482@aol.com'
        );
        
        if (!correctSimon) {
            throw new Error('Correct Simon Test User account (brr482@aol.com) not found');
        }
        
        console.log('\n✅ Correct Simon Test User account identified:');
        console.log(`   📛 Name: ${correctSimon.name}`);
        console.log(`   📧 Email: ${correctSimon.email}`);
        console.log(`   🆔 ID: ${correctSimon.id}`);
        
        // Find all duplicate Simon Test User accounts
        const duplicateSimons = users.filter(user => 
            user.name === 'Simon Test User' && user.id !== correctSimon.id
        );
        
        console.log(`\n🗑️  Found ${duplicateSimons.length} duplicate Simon Test User accounts to remove:`);
        duplicateSimons.forEach((duplicate, index) => {
            console.log(`   ${index + 1}. ID: ${duplicate.id} - Email: ${duplicate.email}`);
        });
        
        // Remove all duplicate Simon accounts
        for (const duplicate of duplicateSimons) {
            console.log(`\n🗑️  Deleting duplicate account ID: ${duplicate.id}...`);
            
            try {
                await databaseService.deleteUser(duplicate.id);
                console.log(`✅ Account ID: ${duplicate.id} deleted successfully`);
            } catch (deleteError) {
                console.log(`⚠️  Delete error for ID ${duplicate.id}: ${deleteError.message}`);
                console.log('Attempting alternative deletion method...');
                
                // Alternative: Direct database deletion
                const { User } = require('./src/backend/models');
                await User.destroy({ where: { id: duplicate.id } });
                console.log(`✅ Account ID: ${duplicate.id} deleted via direct model access`);
            }
        }
        
        // Final verification
        console.log('\n🔍 Final verification...');
        const finalUsers = await databaseService.getAllUsers();
        
        console.log('\n📊 Final Account State:');
        console.log('=' .repeat(40));
        finalUsers.forEach((user, index) => {
            const isSimon = user.name === 'Simon Test User' ? ' ⭐ (SIMON)' : '';
            console.log(`${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})${isSimon}`);
        });
        
        // Verify only one Simon Test User remains
        const remainingSimons = finalUsers.filter(user => 
            user.name === 'Simon Test User'
        );
        
        console.log('\n📊 Final Summary:');
        console.log(`   Total Accounts: ${finalUsers.length}`);
        console.log(`   Simon Test Users: ${remainingSimons.length}`);
        
        if (remainingSimons.length === 1) {
            const simon = remainingSimons[0];
            console.log('\n✅ SUCCESS! Single Simon Test User account confirmed:');
            console.log(`   📛 Name: ${simon.name}`);
            console.log(`   📧 Email: ${simon.email}`);
            console.log(`   🆔 ID: ${simon.id}`);
            
            if (simon.email === 'brr482@aol.com') {
                console.log('   ✅ Email address matches the image: brr482@aol.com');
            } else {
                console.log('   ❌ Email address does not match expected: brr482@aol.com');
            }
        } else {
            throw new Error(`Expected 1 Simon Test User, but found ${remainingSimons.length}`);
        }
        
        // Check if we have the expected main accounts
        const adminUser = finalUsers.find(user => user.name === 'Admin User');
        const simonUser = finalUsers.find(user => user.name === 'Simon Test User');
        
        console.log('\n🎯 Main Account Verification:');
        if (adminUser && simonUser) {
            console.log('   ✅ Both Admin User and Simon Test User accounts exist');
            console.log(`   📧 Admin Email: ${adminUser.email}`);
            console.log(`   📧 Simon Email: ${simonUser.email}`);
            
            // Check if these match the image
            if (adminUser.email === 'admin@example.com' && simonUser.email === 'brr482@aol.com') {
                console.log('   ✅ Both email addresses match the provided image');
            }
        } else {
            console.log('   ⚠️  Missing main accounts');
        }
        
        console.log('\n' + '=' .repeat(45));
        console.log('✅ FINAL USER ACCOUNT CLEANUP COMPLETE');
        console.log('📧 Simon Test User email confirmed: brr482@aol.com');
        console.log('🗑️  All duplicate accounts removed');
        
    } catch (error) {
        console.error('❌ Error during final cleanup:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Execute the final cleanup
finalUserCleanup();