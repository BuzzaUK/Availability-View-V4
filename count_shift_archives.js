const databaseService = require('./src/backend/services/databaseService');

async function countShiftArchives() {
  try {
    console.log('🔍 COUNTING SHIFT ARCHIVES IN DATABASE');
    console.log('='.repeat(50));
    
    // Get all archives from database
    console.log('\n📦 Retrieving all archives from database...');
    const allArchives = await databaseService.getAllArchives();
    
    console.log(`Total archives in database: ${allArchives.length}`);
    
    // Filter for shift-related archives
    const shiftArchives = allArchives.filter(archive => 
      archive.archive_type === 'SHIFT_DATA' || 
      archive.archive_type === 'SHIFT_REPORT' ||
      archive.archive_type === 'EVENTS' // Some archives might be stored as EVENTS type
    );
    
    console.log(`\n📊 SHIFT ARCHIVE BREAKDOWN:`);
    console.log(`- SHIFT_DATA archives: ${allArchives.filter(a => a.archive_type === 'SHIFT_DATA').length}`);
    console.log(`- SHIFT_REPORT archives: ${allArchives.filter(a => a.archive_type === 'SHIFT_REPORT').length}`);
    console.log(`- EVENTS archives: ${allArchives.filter(a => a.archive_type === 'EVENTS').length}`);
    console.log(`- Other archive types: ${allArchives.filter(a => !['SHIFT_DATA', 'SHIFT_REPORT', 'EVENTS'].includes(a.archive_type)).length}`);
    
    console.log(`\n🎯 TOTAL SHIFT-RELATED ARCHIVES: ${shiftArchives.length}`);
    
    // Show details of all shift archives
    if (shiftArchives.length > 0) {
      console.log('\n📋 SHIFT ARCHIVE DETAILS:');
      shiftArchives.forEach((archive, index) => {
        console.log(`  ${index + 1}. ${archive.title} (ID: ${archive.id})`);
        console.log(`     Type: ${archive.archive_type}`);
        console.log(`     Created: ${new Date(archive.created_at).toLocaleString()}`);
        if (archive.archived_data && archive.archived_data.event_count) {
          console.log(`     Events: ${archive.archived_data.event_count}`);
        }
        if (archive.archived_data && archive.archived_data.shift_info) {
          console.log(`     Shift: ${archive.archived_data.shift_info.name || 'Unknown'}`);
        }
        console.log('');
      });
    }
    
    // Show all archive types for reference
    const archiveTypes = [...new Set(allArchives.map(a => a.archive_type))];
    console.log(`\n📝 ALL ARCHIVE TYPES IN DATABASE: ${archiveTypes.join(', ')}`);
    
    console.log('\n✅ Archive count completed successfully');
    
  } catch (error) {
    console.error('❌ Error counting shift archives:', error.message);
    console.error('Stack:', error.stack);
  }
}

countShiftArchives().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});