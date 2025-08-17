const { Shift } = require('./src/backend/models/database');
const { sequelize } = require('./src/backend/config/database');

async function checkShifts() {
    try {
        console.log('=== Checking Shifts Table ===');
        
        // Check recent shifts
        const shifts = await Shift.findAll({ 
            limit: 10, 
            order: [['created_at', 'DESC']] 
        });
        
        console.log(`Recent shifts: ${shifts.length}`);
        shifts.forEach(shift => {
            console.log(`Shift ${shift.id}: ${shift.status} - ${shift.start_time} to ${shift.end_time}`);
        });
        
        console.log('\n=== Checking Current Active Shift ===');
        const activeShift = await Shift.findOne({ 
            where: { status: 'active' } 
        });
        
        console.log('Active shift:', activeShift ? 
            `ID: ${activeShift.id}, Status: ${activeShift.status}` : 'None');
        
        console.log('\n=== Checking All Shift Statuses ===');
        const allShifts = await Shift.findAll({
            attributes: ['id', 'status', 'start_time', 'end_time'],
            order: [['id', 'DESC']],
            limit: 20
        });
        
        console.log('All recent shifts:');
        allShifts.forEach(shift => {
            console.log(`  ${shift.id}: ${shift.status} (${shift.start_time} - ${shift.end_time})`);
        });
        
        await sequelize.close();
        console.log('\n✅ Database check completed');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

checkShifts();