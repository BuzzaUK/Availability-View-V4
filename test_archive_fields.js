// Set environment and disable logging
process.env.NODE_ENV = 'development';
const originalLog = console.log;
console.log = () => {};

const databaseService = require('./src/backend/services/databaseService');

// Restore console.log
console.log = originalLog;

async function testArchiveFields() {
  console.log('🔍 Testing archive field names...');
  
  try {
    const allArchives = await databaseService.getAllArchives();
    console.log('Total archives:', allArchives.length);
    
    if (allArchives.length > 0) {
      console.log('\n📋 First archive fields:');
      const firstArchive = allArchives[0];
      console.log('Available fields:', Object.keys(firstArchive));
      
      console.log('\n📋 Archive details:');
      allArchives.forEach((archive, index) => {
        console.log(`${index + 1}. ID: ${archive.id}`);
        console.log(`   Type field: ${archive.type}`);
        console.log(`   Archive_type field: ${archive.archive_type}`);
        console.log(`   Title: ${archive.title}`);
        console.log('');
      });
      
      // Test the filtering logic
      console.log('\n🔍 Testing filter logic:');
      const byType = allArchives.filter(archive => archive.type === 'SHIFT_REPORT');
      const byArchiveType = allArchives.filter(archive => archive.archive_type === 'SHIFT_REPORT');
      
      console.log('Filtered by "type":', byType.length, 'reports');
      console.log('Filtered by "archive_type":', byArchiveType.length, 'reports');
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error.message);
  }
}

testArchiveFields().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});