const databaseService = require('./src/backend/services/databaseService');

async function consolidateSimonAccounts() {
    console.log('🔧 CONSOLIDATING SIMON ACCOUNTS');
    console.log('=' .repeat(45));
    
    try {
        // Get all users to verify current state
        console.log('\n📊 Current database state:');
        const users = await databaseService.getAllUsers();
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})`);
        });
        
        // Find both Simon accounts
        const simonTestUser = users.find(user => user.id === 3 && user.name === 'Simon Test User');
        const simonBurrell = users.find(user => user.id === 4 && user.name === 'Simon Burrell');
        
        if (!simonTestUser) {
            throw new Error('Simon Test User (ID: 3) not found');
        }
        
        if (!simonBurrell) {
            throw new Error('Simon Burrell (ID: 4) not found');
        }
        
        console.log('\n🎯 Accounts to consolidate:');
        console.log(`   1. Simon Test User - ${simonTestUser.email} (ID: ${simonTestUser.id})`);
        console.log(`   2. Simon Burrell - ${simonBurrell.email} (ID: ${simonBurrell.id})`);
        
        // Step 1: Delete the Simon Burrell duplicate account
        console.log('\n🗑️  Removing duplicate Simon Burrell account...');
        
        try {
            await databaseService.deleteUser(simonBurrell.id);
            console.log('✅ Simon Burrell account (ID: 4) deleted successfully');
        } catch (deleteError) {
            console.log(`⚠️  Delete error: ${deleteError.message}`);
            console.log('Attempting alternative deletion method...');
            
            // Alternative: Direct database deletion if service method fails
            const { User } = require('./src/backend/models');
            await User.destroy({ where: { id: simonBurrell.id } });
            console.log('✅ Simon Burrell account deleted via direct model access');
        }
        
        // Step 2: Update Simon Test User's email
        console.log('\n🔧 Updating Simon Test User email to brr482@aol.com...');
        
        const updatedUser = await databaseService.updateUser(simonTestUser.id, {
            email: 'brr482@aol.com'
        });
        
        console.log('✅ Email update completed!');
        
        // Step 3: Verify the consolidation
        console.log('\n🔍 Verifying account consolidation...');
        const verifyUsers = await databaseService.getAllUsers();
        
        console.log('\n📊 Final Account State:');
        console.log('=' .repeat(40));
        verifyUsers.forEach((user, index) => {
            const isTarget = user.id === 3 ? ' ⭐ (UPDATED)' : '';
            console.log(`${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})${isTarget}`);
        });
        
        // Verify Simon Test User has correct email
        const finalSimon = verifyUsers.find(user => user.id === 3);
        if (finalSimon && finalSimon.email === 'brr482@aol.com') {
            console.log('\n✅ CONSOLIDATION SUCCESSFUL!');
            console.log(`   📛 Name: ${finalSimon.name}`);
            console.log(`   📧 Email: ${finalSimon.email}`);
            console.log(`   🆔 ID: ${finalSimon.id}`);
        } else {
            throw new Error('Consolidation verification failed');
        }
        
        // Check final account count
        console.log('\n📊 Account Count Summary:');
        console.log(`   Total Accounts: ${verifyUsers.length}`);
        console.log(`   Expected: 3 (after removing 1 duplicate)`);
        
        if (verifyUsers.length === 3) {
            console.log('   ✅ Account count is correct');
        } else {
            console.log(`   ⚠️  Unexpected account count: ${verifyUsers.length}`);
        }
        
        // Verify no duplicate emails
        const emails = verifyUsers.map(user => user.email);
        const uniqueEmails = [...new Set(emails)];
        
        if (emails.length === uniqueEmails.length) {
            console.log('   ✅ No duplicate emails found');
        } else {
            console.log('   ⚠️  Duplicate emails still exist');
        }
        
        console.log('\n' + '=' .repeat(45));
        console.log('✅ SIMON ACCOUNTS CONSOLIDATION COMPLETE');
        console.log('📧 Simon Test User now has correct email: brr482@aol.com');
        console.log('🗑️  Duplicate Simon Burrell account removed');
        
    } catch (error) {
        console.error('❌ Error consolidating Simon accounts:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Execute the account consolidation
consolidateSimonAccounts();