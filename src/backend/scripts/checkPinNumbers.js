const { sequelize } = require('../config/database');
const { User, Logger, Asset } = require('../models/database');

async function checkPinNumbers() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    
    console.log('🔍 Checking existing assets and their pin numbers...');

    const assets = await Asset.findAll({
      include: [{ model: Logger, as: 'logger' }]
    });
    
    const loggers = await Logger.findAll();

    console.log('\n📊 EXISTING LOGGERS:');
    loggers.forEach(logger => {
      console.log(`  - ${logger.logger_id} (ID: ${logger.id}) - ${logger.logger_name}`);
    });

    console.log('\n📊 EXISTING ASSETS:');
    if (assets.length === 0) {
      console.log('  No assets found in database');
    } else {
      assets.forEach(asset => {
        const logger = asset.logger;
        console.log(`  - ${asset.name} | Pin: ${asset.pin_number} | Logger: ${logger ? logger.logger_id : 'None'}`);
      });
    }

    console.log('\n🎯 AVAILABLE PIN NUMBERS FOR ESP32_001:');
    const esp32Logger = loggers.find(l => l.logger_id === 'ESP32_001');
    if (esp32Logger) {
      const usedPins = assets
        .filter(asset => asset.logger_id == esp32Logger.id)
        .map(asset => asset.pin_number);
      
      console.log(`Used pins: [${usedPins.join(', ')}]`);
      
      const availablePins = [];
      for (let pin = 1; pin <= 20; pin++) {
        if (!usedPins.includes(pin)) {
          availablePins.push(pin);
        }
      }
      
      console.log(`Available pins: [${availablePins.slice(0, 10).join(', ')}${availablePins.length > 10 ? ', ...' : ''}]`);
    } else {
      console.log('ESP32_001 logger not found');
    }

    console.log('\n✅ Check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPinNumbers();