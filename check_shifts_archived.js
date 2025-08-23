const { Shift } = require('./src/backend/models/database');
const { sequelize } = require('./src/backend/config/database');

async function checkShifts() {
  try {
    console.log('🔍 Checking all shifts in database...');
    const shifts = await Shift.findAll({
      order: [['created_at', 'DESC']],
      limit: 20
    });
    
    console.log(`Found ${shifts.length} shifts:`);
    shifts.forEach(shift => {
      console.log(`ID: ${shift.id}, Name: ${shift.shift_name}, Status: ${shift.status}, Archived: ${shift.archived}, Created: ${shift.created_at}`);
    });
    
    console.log('\n🔍 Checking non-archived shifts (what should appear in dropdown)...');
    const nonArchivedShifts = await Shift.findAll({
      where: { archived: false },
      order: [['created_at', 'DESC']]
    });
    
    console.log(`Non-archived shifts: ${nonArchivedShifts.length}`);
    nonArchivedShifts.forEach(shift => {
      console.log(`ID: ${shift.id}, Name: ${shift.shift_name}, Status: ${shift.status}, Created: ${shift.created_at}`);
    });
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkShifts();