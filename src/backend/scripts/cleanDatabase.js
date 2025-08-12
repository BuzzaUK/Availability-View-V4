const fs = require('fs');
const path = require('path');

function cleanDatabase() {
  try {
    console.log('🧹 Cleaning database files...');
    
    const backendDir = path.join(__dirname, '..');
    const filesToClean = [
      'database.sqlite',
      'database.sqlite-shm',
      'database.sqlite-wal'
    ];
    
    let cleaned = 0;
    
    filesToClean.forEach(filename => {
      const filePath = path.join(backendDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted ${filename}`);
        cleaned++;
      }
    });
    
    if (cleaned === 0) {
      console.log('ℹ️ No database files to clean');
    } else {
      console.log(`🎉 Cleaned ${cleaned} database file(s)`);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning database files:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  cleanDatabase();
  console.log('Database cleanup completed');
}

module.exports = { cleanDatabase };