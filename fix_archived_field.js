const { Shift } = require('./src/backend/models/database');
const { sequelize } = require('./src/backend/config/database');

async function fixArchivedField() {
  try {
    console.log('🔧 Fixing archived field for all existing shifts...');
    
    // Update all shifts where archived is null/undefined to false
    const [updatedCount] = await Shift.update(
      { archived: false },
      { 
        where: {
          archived: null
        }
      }
    );
    
    console.log(`✅ Updated ${updatedCount} shifts to set archived = false`);
    
    // Also update any that might be undefined (using raw SQL as backup)
    await sequelize.query(`
      UPDATE shifts 
      SET archived = false 
      WHERE archived IS NULL OR archived = ''
    `);
    
    console.log('✅ Executed raw SQL update as backup');
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const allShifts = await Shift.findAll({
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    console.log(`Found ${allShifts.length} recent shifts:`);
    allShifts.forEach(shift => {
      console.log(`ID: ${shift.id}, Name: ${shift.shift_name}, Archived: ${shift.archived}`);
    });
    
    const nonArchivedCount = await Shift.count({
      where: { archived: false }
    });
    
    console.log(`\n✅ Total non-archived shifts: ${nonArchivedCount}`);
    
    await sequelize.close();
    console.log('\n🎉 Fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

fixArchivedField();