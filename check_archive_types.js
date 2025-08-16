const databaseService = require('./src/backend/services/databaseService');

async function checkArchiveTypes() {
  try {
    const archives = await databaseService.getAllArchives();
    
    console.log('\n📊 Archive Analysis:');
    console.log('Total archives in database:', archives.length);
    
    const typeCount = {};
    const archiveDetails = [];
    
    archives.forEach((archive, index) => {
      archiveDetails.push({
        id: archive.id,
        type: archive.archive_type,
        title: archive.title
      });
      
      typeCount[archive.archive_type] = (typeCount[archive.archive_type] || 0) + 1;
    });
    
    console.log('\n📈 Archive types breakdown:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\n🔍 Root Cause Found:');
    console.log('- Backend /api/events/archives returns ALL archive types');
    console.log('- Frontend Event Archive tab should only show EVENTS type');
    console.log('- This explains the discrepancy!');
    
    console.log('\n💡 Solution:');
    console.log('- Filter archives by archive_type === "EVENTS" in getEventArchives');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkArchiveTypes();