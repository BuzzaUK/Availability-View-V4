const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function checkArchivesSchema() {
  try {
    console.log('🔍 Checking archives table schema...');
    
    // Get table schema
    const [schema] = await sequelize.query(`PRAGMA table_info(archives)`);
    
    console.log('\n📊 Archives table columns:');
    schema.forEach((column, index) => {
      console.log(`  ${index + 1}. ${column.name} (${column.type}) - ${column.notnull ? 'NOT NULL' : 'NULL'} - Default: ${column.dflt_value || 'None'}`);
    });
    
    // Check existing archives structure
    const [sampleArchives] = await sequelize.query(`
      SELECT * FROM archives LIMIT 2
    `);
    
    console.log('\n📋 Sample archives:');
    if (sampleArchives.length === 0) {
      console.log('  No archives found');
    } else {
      sampleArchives.forEach((archive, index) => {
        console.log(`  Archive ${index + 1}:`);
        Object.keys(archive).forEach(key => {
          if (key === 'archived_data') {
            console.log(`    ${key}: [JSON data - ${JSON.stringify(archive[key]).length} characters]`);
          } else {
            console.log(`    ${key}: ${archive[key]}`);
          }
        });
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkArchivesSchema();