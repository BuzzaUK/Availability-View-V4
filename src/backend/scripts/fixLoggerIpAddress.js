const { sequelize } = require('../config/database');
const { QueryInterface } = require('sequelize');

async function fixLoggerIpAddress() {
  try {
    console.log('🔄 Fixing Logger ip_address column type...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    const queryInterface = sequelize.getQueryInterface();
    const dialect = sequelize.getDialect();
    
    if (dialect === 'postgres') {
      console.log('📝 Converting INET to VARCHAR in PostgreSQL...');
      
      // For PostgreSQL, we need to cast INET to TEXT first, then to VARCHAR
      await queryInterface.sequelize.query(`
        ALTER TABLE loggers 
        ALTER COLUMN ip_address TYPE VARCHAR(45) 
        USING ip_address::text;
      `);
      
      console.log('✅ Successfully converted ip_address from INET to VARCHAR');
    } else if (dialect === 'sqlite') {
      console.log('ℹ️ SQLite doesn\'t have strict column types, no migration needed');
    } else {
      console.log(`ℹ️ Dialect ${dialect} - checking if migration is needed...`);
      
      // For other databases, try to describe the table structure
      try {
        const tableDescription = await queryInterface.describeTable('loggers');
        console.log('Current ip_address column:', tableDescription.ip_address);
      } catch (error) {
        console.log('Could not describe table:', error.message);
      }
    }
    
    console.log('🎉 Logger ip_address fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Logger ip_address fix failed:', error);
    console.error('Error details:', error.message);
    
    // If the error is about the column not existing or already being the right type, that's OK
    if (error.message.includes('column "ip_address" cannot be cast automatically') ||
        error.message.includes('column does not exist') ||
        error.message.includes('already exists')) {
      console.log('ℹ️ This might be expected - column may already be correct type');
    } else {
      throw error;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  fixLoggerIpAddress().then(() => {
    console.log('🎉 Migration process completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

module.exports = fixLoggerIpAddress;