const path = require('path');
const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'src', 'backend', 'database.sqlite'),
    logging: false
});

async function checkDatabaseTables() {
    try {
        console.log('🔍 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connection established.');

        // Get all table names
        const [results] = await sequelize.query(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
        );

        console.log('\n📋 AVAILABLE TABLES:');
        results.forEach(table => {
            console.log(`- ${table.name}`);
        });

        // Check for tables that might contain shift reports or archives
        const potentialTables = results.filter(table => 
            table.name.toLowerCase().includes('shift') || 
            table.name.toLowerCase().includes('report') || 
            table.name.toLowerCase().includes('archive')
        );

        console.log('\n🎯 POTENTIAL SHIFT/REPORT/ARCHIVE TABLES:');
        for (const table of potentialTables) {
            console.log(`\n📊 Table: ${table.name}`);
            
            // Get table schema
            const [schema] = await sequelize.query(`PRAGMA table_info(${table.name});`);
            console.log('Columns:');
            schema.forEach(col => {
                console.log(`  - ${col.name} (${col.type})`);
            });

            // Get row count
            const [count] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table.name};`);
            console.log(`Total rows: ${count[0].count}`);

            // Show sample data if exists
            if (count[0].count > 0) {
                const [sample] = await sequelize.query(`SELECT * FROM ${table.name} LIMIT 3;`);
                console.log('Sample data:');
                sample.forEach((row, index) => {
                    console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
                });
            }
        }

        // Also check for any tables with 'event' in the name
        const eventTables = results.filter(table => 
            table.name.toLowerCase().includes('event')
        );

        if (eventTables.length > 0) {
            console.log('\n📅 EVENT TABLES:');
            for (const table of eventTables) {
                console.log(`\n📊 Table: ${table.name}`);
                
                // Get row count
                const [count] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table.name};`);
                console.log(`Total rows: ${count[0].count}`);

                // Get table schema
                const [schema] = await sequelize.query(`PRAGMA table_info(${table.name});`);
                console.log('Columns:');
                schema.forEach(col => {
                    console.log(`  - ${col.name} (${col.type})`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
        console.log('\n🔒 Database connection closed.');
    }
}

checkDatabaseTables();