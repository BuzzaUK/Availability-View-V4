const { sequelize } = require('../config/database');
const { User, Logger, Asset, Event, Shift, Archive, Settings } = require('../models/database');

async function debugAssets() {
  try {
    console.log('🔍 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    console.log('🔍 Syncing database tables...');
    await sequelize.sync();
    console.log('✅ Database tables synced');
    
    console.log('🔍 Checking existing assets...');
    const assets = await Asset.findAll({
      include: [{ model: Logger, as: 'logger' }]
    });
    console.log(`📊 Found ${assets.length} assets:`, assets.map(a => ({
      id: a.id,
      name: a.name,
      logger_id: a.logger_id,
      pin_number: a.pin_number
    })));
    
    console.log('🔍 Checking existing loggers...');
    const loggers = await Logger.findAll();
    console.log(`📊 Found ${loggers.length} loggers:`, loggers.map(l => ({
      id: l.id,
      logger_id: l.logger_id,
      logger_name: l.logger_name
    })));
    
    console.log('🔍 Checking existing users...');
    const users = await User.findAll();
    console.log(`📊 Found ${users.length} users:`, users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role
    })));
    
    console.log('✅ Debug complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Debug error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

debugAssets();