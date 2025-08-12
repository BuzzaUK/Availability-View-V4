const { sequelize, testConnection } = require('../config/database');
const models = require('../models/database');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Sync all models (create tables)
    await sequelize.sync({ force: false, alter: true });
    
    console.log('✅ Database migration completed successfully!');
    console.log('📊 Tables created/updated:');
    console.log('  - users');
    console.log('  - loggers');
    console.log('  - assets');
    console.log('  - events');
    console.log('  - shifts');
    console.log('  - archives');
    console.log('  - settings');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate().then(() => {
    console.log('🎉 Migration process completed');
    process.exit(0);
  });
}

module.exports = migrate;