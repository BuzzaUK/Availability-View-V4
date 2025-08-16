const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkShiftReportArchives() {
  const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');
  const db = new sqlite3.Database(dbPath);
  
  console.log('🔍 Checking SHIFT_REPORT archives in database...');
  
  return new Promise((resolve, reject) => {
    // Get all archives
    db.all('SELECT * FROM archives ORDER BY created_at DESC', (err, allArchives) => {
      if (err) {
        console.error('❌ Error fetching archives:', err);
        reject(err);
        return;
      }
      
      console.log(`\n📊 Total archives in database: ${allArchives.length}`);
      
      // Filter SHIFT_REPORT archives
      const shiftReportArchives = allArchives.filter(archive => archive.archive_type === 'SHIFT_REPORT');
      const eventArchives = allArchives.filter(archive => archive.archive_type === 'EVENTS');
      
      console.log(`📋 SHIFT_REPORT archives: ${shiftReportArchives.length}`);
      console.log(`📋 EVENTS archives: ${eventArchives.length}`);
      
      if (shiftReportArchives.length > 0) {
        console.log('\n📄 SHIFT_REPORT Archive Details:');
        shiftReportArchives.forEach((archive, index) => {
          console.log(`${index + 1}. ID: ${archive.id}`);
          console.log(`   Title: ${archive.title}`);
          console.log(`   Type: ${archive.archive_type}`);
          console.log(`   Created: ${archive.created_at}`);
          console.log(`   Status: ${archive.status}`);
          console.log(`   Description: ${archive.description || 'N/A'}`);
          console.log('   ---');
        });
      } else {
        console.log('\n❌ No SHIFT_REPORT archives found in database!');
      }
      
      if (eventArchives.length > 0) {
        console.log('\n📄 EVENTS Archive Details (for comparison):');
        eventArchives.forEach((archive, index) => {
          console.log(`${index + 1}. ID: ${archive.id}, Title: ${archive.title}, Type: ${archive.archive_type}`);
        });
      }
      
      db.close();
      resolve();
    });
  });
}

checkShiftReportArchives().catch(console.error);