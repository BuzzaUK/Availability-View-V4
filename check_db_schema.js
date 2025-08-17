const { sequelize } = require('./src/backend/config/database');

async function checkSchema() {
    try {
        console.log('=== Checking Shifts Table Schema ===');
        const [results] = await sequelize.query('PRAGMA table_info(shifts);');
        
        console.log('Shifts table columns:');
        results.forEach(col => {
            console.log(`  ${col.name}: ${col.type} (nullable: ${col.notnull === 0})`);
        });
        
        console.log('\n=== Checking if shifts table has data ===');
        const [countResult] = await sequelize.query('SELECT COUNT(*) as count FROM shifts;');
        console.log(`Total shifts in database: ${countResult[0].count}`);
        
        if (countResult[0].count > 0) {
            console.log('\n=== Sample shift data ===');
            const [sampleData] = await sequelize.query('SELECT * FROM shifts LIMIT 3;');
            sampleData.forEach((shift, index) => {
                console.log(`Shift ${index + 1}:`, shift);
            });
        }
        
        await sequelize.close();
        console.log('\n✅ Schema check completed');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

checkSchema();