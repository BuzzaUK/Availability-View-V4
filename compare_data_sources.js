const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const databaseService = require('./src/backend/services/databaseService');

// Database configuration - using SQLite like the backend
const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');

async function compareDataSources() {
  console.log('=== Comparing Data Sources ===\n');
  
  // 1. Direct SQLite query
  console.log('1. Direct SQLite Query:');
  const directData = await new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });
    
    const query = `
      SELECT id, title, archived_data
      FROM archives 
      WHERE archive_type = 'SHIFT_REPORT'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    db.get(query, (err, archive) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (archive) {
        const archivedData = JSON.parse(archive.archived_data);
        console.log('   Duration:', archivedData.duration);
        console.log('   Start Time:', archivedData.start_time);
        console.log('   End Time:', archivedData.end_time);
        console.log('   Availability:', archivedData.availability);
        console.log('   Events Processed:', archivedData.events_processed);
      }
      
      db.close();
      resolve(archive);
    });
  });
  
  // 2. Sequelize model query
  console.log('\n2. Sequelize Model Query:');
  try {
    const allArchives = await databaseService.getAllArchives();
    const shiftReports = allArchives.filter(archive => archive.archive_type === 'SHIFT_REPORT');
    
    if (shiftReports.length > 0) {
      const archive = shiftReports[0];
      const archivedData = archive.archived_data;
      console.log('   Duration:', archivedData.duration);
      console.log('   Start Time:', archivedData.start_time);
      console.log('   End Time:', archivedData.end_time);
      console.log('   Availability:', archivedData.availability);
      console.log('   Events Processed:', archivedData.events_processed);
      console.log('   Data Type:', typeof archivedData);
      console.log('   Is Plain Object:', archivedData.constructor === Object);
    } else {
      console.log('   No shift reports found');
    }
  } catch (error) {
    console.error('   Error:', error.message);
  }
  
  // 3. Report Service query
  console.log('\n3. Report Service Query:');
  try {
    const reportService = require('./src/backend/services/reportService');
    const reports = await reportService.getArchivedShiftReports();
    
    if (reports.length > 0) {
      const archive = reports[0];
      const archivedData = archive.archived_data;
      console.log('   Duration:', archivedData.duration);
      console.log('   Start Time:', archivedData.start_time);
      console.log('   End Time:', archivedData.end_time);
      console.log('   Availability:', archivedData.availability);
      console.log('   Events Processed:', archivedData.events_processed);
      console.log('   Data Type:', typeof archivedData);
    } else {
      console.log('   No shift reports found');
    }
  } catch (error) {
    console.error('   Error:', error.message);
  }
}

compareDataSources().then(() => {
  console.log('\n=== Comparison Complete ===');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});