const databaseService = require('./src/backend/services/databaseService');

async function debugUserUpdate() {
  try {
    console.log('Fetching current user data...');
    const users = await databaseService.getAllUsers();
    
    console.log('\nCurrent users with shiftReportPreferences:');
    users.forEach(user => {
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`  ID: ${user.id}`);
      console.log(`  receive_reports: ${user.receive_reports}`);
      console.log(`  shiftReportPreferences:`, user.shiftReportPreferences);
      console.log(`  shiftReportPreferences type:`, typeof user.shiftReportPreferences);
      console.log('---');
    });

    // Now let's update one user's shift preferences
    const adminUser = users.find(u => u.email === 'admin@example.com');
    if (adminUser) {
      console.log('\nUpdating admin user shift preferences...');
      
      const updateData = {
        shiftReportPreferences: {
          enabled: true,
          shifts: ['0600', '1400'],
          emailFormat: 'pdf'
        },
        receive_reports: true
      };
      
      console.log('Update data being sent:', updateData);
      
      const updatedUser = await databaseService.updateUser(adminUser.id, updateData);
      console.log('\nUpdated user result:', updatedUser);
      
      // Fetch all users again to see the changes
      console.log('\nFetching users after update...');
      const usersAfterUpdate = await databaseService.getAllUsers();
      
      const adminAfterUpdate = usersAfterUpdate.find(u => u.email === 'admin@example.com');
      console.log('\nAdmin user after update:');
      console.log(`  receive_reports: ${adminAfterUpdate.receive_reports}`);
      console.log(`  shiftReportPreferences:`, adminAfterUpdate.shiftReportPreferences);
      console.log(`  shiftReportPreferences type:`, typeof adminAfterUpdate.shiftReportPreferences);
      
      if (adminAfterUpdate.shiftReportPreferences) {
        console.log(`  enabled: ${adminAfterUpdate.shiftReportPreferences.enabled}`);
        console.log(`  shifts: ${JSON.stringify(adminAfterUpdate.shiftReportPreferences.shifts)}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugUserUpdate();