const databaseService = require('./src/backend/services/databaseService');

async function cleanUserShiftPreferences() {
  try {
    console.log('🔍 Checking user shift preferences for legacy times...');
    
    const users = await databaseService.getAllUsers();
    const validShiftTimes = ['0600', '1400', '2200'];
    let usersToUpdate = [];
    
    for (const user of users) {
      if (user.shiftReportPreferences?.shifts) {
        const invalidShifts = user.shiftReportPreferences.shifts.filter(shift => !validShiftTimes.includes(shift));
        
        if (invalidShifts.length > 0) {
          console.log(`❌ User ${user.name} has invalid shifts: ${invalidShifts.join(', ')}`);
          const cleanShifts = user.shiftReportPreferences.shifts.filter(shift => validShiftTimes.includes(shift));
          
          usersToUpdate.push({
            id: user.id,
            name: user.name,
            oldShifts: user.shiftReportPreferences.shifts,
            newShifts: cleanShifts
          });
        }
      }
    }
    
    if (usersToUpdate.length > 0) {
      console.log(`\n🧹 Cleaning up ${usersToUpdate.length} users...`);
      
      for (const userUpdate of usersToUpdate) {
        const originalUser = users.find(u => u.id === userUpdate.id);
        
        await databaseService.updateUser(userUpdate.id, {
          shiftReportPreferences: {
            ...originalUser.shiftReportPreferences,
            shifts: userUpdate.newShifts
          }
        });
        
        console.log(`✅ Updated ${userUpdate.name}: [${userUpdate.oldShifts.join(', ')}] → [${userUpdate.newShifts.join(', ')}]`);
      }
      
      console.log('\n✅ User shift preferences cleanup complete!');
    } else {
      console.log('✅ All user shift preferences are clean!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cleanUserShiftPreferences();