const { sequelize } = require('./src/backend/config/database');

async function checkActiveShift() {
    try {
        console.log('=== Checking for Active Shifts ===');
        
        const [results] = await sequelize.query("SELECT * FROM shifts WHERE status = 'active' ORDER BY created_at DESC LIMIT 1;");
        
        if (results.length > 0) {
            console.log('✅ Active shift found:');
            const shift = results[0];
            console.log(`  ID: ${shift.id}`);
            console.log(`  Name: ${shift.shift_name}`);
            console.log(`  Status: ${shift.status}`);
            console.log(`  Start Time: ${shift.start_time}`);
            console.log(`  End Time: ${shift.end_time || 'Not set'}`);
        } else {
            console.log('❌ No active shift found');
            
            console.log('\n=== Recent Shifts ===');
            const [allShifts] = await sequelize.query("SELECT id, shift_name, status, start_time, end_time FROM shifts ORDER BY created_at DESC LIMIT 5;");
            
            allShifts.forEach(s => {
                console.log(`  ${s.id}: ${s.shift_name} (${s.status}) - ${s.start_time}`);
            });
        }
        
        await sequelize.close();
        console.log('\n✅ Active shift check completed');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

checkActiveShift();