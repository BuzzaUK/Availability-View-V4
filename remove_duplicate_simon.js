const databaseService = require('./src/backend/services/databaseService');

async function removeDuplicateSimon() {
    console.log('🗑️  REMOVING DUPLICATE SIMON TEST USER ACCOUNT');
    console.log('=' .repeat(55));
    
    try {
        // Get all users to verify current state
        console.log('\n📊 Current database state:');
        const users = await databaseService.getAllUsers();
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})`);
        });
        
        // Find both Simon Test User accounts
        const simonUsers = users.filter(user => 
            user.name === 'Simon Test User'
        );
        
        console.log(`\n🎯 Found ${simonUsers.length} Simon Test User accounts:`);
        simonUsers.forEach((simon, index) => {
            const status = simon.email === 'brr482@aol.com' ? ' ✅ (CORRECT)' : ' ❌ (DUPLICATE)';
            console.log(`   ${index + 1}. ID: ${simon.id} - Email: ${simon.email}${status}`);
        });
        
        // Find the duplicate account (the one with simon@example.com)
        const duplicateAccount = simonUsers.find(user => 
            user.email === 'simon@example.com'
        );
        
        const correctAccount = simonUsers.find(user => 
            user.email === 'brr482@aol.com'
        );
        
        if (!duplicateAccount) {
            console.log('\n✅ No duplicate Simon Test User account found');
            return;
        }
        
        if (!correctAccount) {
            throw new Error('Correct Simon Test User account (brr482@aol.com) not found');
        }
        
        console.log('\n🗑️  Removing duplicate account:');
        console.log(`   📛 Name: ${duplicateAccount.name}`);
        console.log(`   📧 Email: ${duplicateAccount.email}`);
        console.log(`   🆔 ID: ${duplicateAccount.id}`);
        
        console.log('\n✅ Keeping correct account:');
        console.log(`   📛 Name: ${correctAccount.name}`);
        console.log(`   📧 Email: ${correctAccount.email}`);
        console.log(`   🆔 ID: ${correctAccount.id}`);
        
        // Delete the duplicate account
        console.log('\n🗑️  Deleting duplicate account...');
        
        try {
            await databaseService.deleteUser(duplicateAccount.id);
            console.log('✅ Duplicate account deleted successfully');
        } catch (deleteError) {
            console.log(`⚠️  Delete error: ${deleteError.message}`);
            console.log('Attempting alternative deletion method...');
            
            // Alternative: Direct database deletion if service method fails
            const { User } = require('./src/backend/models');
            await User.destroy({ where: { id: duplicateAccount.id } });
            console.log('✅ Duplicate account deleted via direct model access');
        }
        
        // Verify the cleanup
        console.log('\n🔍 Verifying duplicate removal...');
        const verifyUsers = await databaseService.getAllUsers();
        
        console.log('\n📊 Final Account State:');
        console.log('=' .repeat(40));
        verifyUsers.forEach((user, index) => {
            const isSimon = user.name === 'Simon Test User' ? ' ⭐ (SIMON)' : '';
            console.log(`${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})${isSimon}`);
        });
        
        // Verify only one Simon Test User remains
        const remainingSimons = verifyUsers.filter(user => 
            user.name === 'Simon Test User'
        );
        
        if (remainingSimons.length === 1) {
            const simon = remainingSimons[0];
            console.log('\n✅ DUPLICATE REMOVAL SUCCESSFUL!');
            console.log(`   📛 Name: ${simon.name}`);
            console.log(`   📧 Email: ${simon.email}`);
            console.log(`   🆔 ID: ${simon.id}`);
            
            if (simon.email === 'brr482@aol.com') {
                console.log('   ✅ Email address is correct');
            } else {
                console.log('   ❌ Email address is incorrect');
            }
        } else {
            throw new Error(`Expected 1 Simon Test User, but found ${remainingSimons.length}`);
        }
        
        // Final account count check
        console.log('\n📊 Final Account Summary:');
        console.log(`   Total Accounts: ${verifyUsers.length}`);
        console.log(`   Simon Test Users: ${remainingSimons.length}`);
        
        // Check if we now have the expected 2 main accounts (Admin + Simon)
        const mainAccounts = verifyUsers.filter(user => 
            user.name === 'Admin User' || user.name === 'Simon Test User'
        );
        
        console.log(`   Main Accounts (Admin + Simon): ${mainAccounts.length}`);
        
        if (mainAccounts.length === 2) {
            console.log('   ✅ Main accounts are correct');
        }
        
        console.log('\n' + '=' .repeat(55));
        console.log('✅ DUPLICATE SIMON ACCOUNT REMOVAL COMPLETE');
        console.log('📧 Simon Test User now has unique, correct email: brr482@aol.com');
        
    } catch (error) {
        console.error('❌ Error removing duplicate Simon account:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Execute the duplicate removal
removeDuplicateSimon();