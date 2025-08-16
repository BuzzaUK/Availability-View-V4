const databaseService = require('./src/backend/services/databaseService');

async function updateSimonTestUserEmail() {
    console.log('🔧 UPDATING SIMON TEST USER EMAIL ADDRESS');
    console.log('=' .repeat(55));
    
    try {
        // Get all users to verify current state
        console.log('\n📊 Current database state:');
        const users = await databaseService.getAllUsers();
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})`);
        });
        
        // Find Simon Test User (ID: 3)
        const simonTestUser = users.find(user => user.id === 3 && user.name === 'Simon Test User');
        
        if (!simonTestUser) {
            throw new Error('Simon Test User (ID: 3) not found');
        }
        
        console.log('\n🎯 Target User Found:');
        console.log(`   📛 Name: ${simonTestUser.name}`);
        console.log(`   📧 Current Email: ${simonTestUser.email}`);
        console.log(`   🆔 ID: ${simonTestUser.id}`);
        
        // Check if brr482@aol.com is already in use
        const existingEmailUser = users.find(user => user.email === 'brr482@aol.com');
        
        if (existingEmailUser && existingEmailUser.id !== simonTestUser.id) {
            console.log('\n⚠️  Email brr482@aol.com is already in use by:');
            console.log(`   📛 Name: ${existingEmailUser.name}`);
            console.log(`   🆔 ID: ${existingEmailUser.id}`);
            console.log('\n🔄 This appears to be a duplicate account situation.');
            
            // Check if this is Simon Burrell account that should be consolidated
            if (existingEmailUser.name === 'Simon Burrell') {
                console.log('\n💡 Recommendation: Simon Burrell and Simon Test User appear to be the same person.');
                console.log('   Option 1: Update Simon Test User email to brr482@aol.com');
                console.log('   Option 2: Remove Simon Burrell account and keep Simon Test User');
                console.log('\n🎯 Proceeding with Option 1: Updating Simon Test User email');
            }
        }
        
        // Update Simon Test User's email to brr482@aol.com
        console.log('\n🔧 Updating Simon Test User email address...');
        
        const updatedUser = await databaseService.updateUser(simonTestUser.id, {
            email: 'brr482@aol.com'
        });
        
        console.log('✅ Email update completed!');
        console.log(`   📧 New Email: brr482@aol.com`);
        
        // Verify the update
        console.log('\n🔍 Verifying update...');
        const verifyUsers = await databaseService.getAllUsers();
        const updatedSimon = verifyUsers.find(user => user.id === 3);
        
        if (updatedSimon && updatedSimon.email === 'brr482@aol.com') {
            console.log('✅ Update verified successfully!');
            console.log(`   📛 Name: ${updatedSimon.name}`);
            console.log(`   📧 Email: ${updatedSimon.email}`);
            console.log(`   🆔 ID: ${updatedSimon.id}`);
        } else {
            throw new Error('Update verification failed');
        }
        
        // Show final account summary
        console.log('\n📊 Final Account Summary:');
        console.log('=' .repeat(40));
        verifyUsers.forEach((user, index) => {
            const isTarget = user.id === 3 ? ' ⭐' : '';
            console.log(`${index + 1}. ${user.name} - ${user.email} (ID: ${user.id})${isTarget}`);
        });
        
        console.log('\n' + '=' .repeat(55));
        console.log('✅ SIMON TEST USER EMAIL UPDATE COMPLETE');
        console.log('📧 Simon Test User now has email: brr482@aol.com');
        
        // Note about account consolidation
        const duplicateCheck = verifyUsers.filter(user => 
            user.email === 'brr482@aol.com' || 
            (user.name && user.name.toLowerCase().includes('simon'))
        );
        
        if (duplicateCheck.length > 1) {
            console.log('\n⚠️  NOTICE: Multiple accounts may belong to the same person:');
            duplicateCheck.forEach(user => {
                console.log(`   - ${user.name} (${user.email}) - ID: ${user.id}`);
            });
            console.log('\n💡 Consider consolidating duplicate accounts if they belong to the same person.');
        }
        
    } catch (error) {
        console.error('❌ Error updating Simon Test User email:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Execute the email update
updateSimonTestUserEmail();