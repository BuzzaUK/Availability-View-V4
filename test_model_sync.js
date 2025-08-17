const { sequelize } = require('./src/backend/config/database');
const Archive = require('./src/backend/models/database/Archive');
const databaseService = require('./src/backend/services/databaseService');

async function testModelSync() {
  try {
    console.log('🔍 Testing Archive Model Sync...');
    
    // Test 1: Check if we can query archives directly with the model
    console.log('\n1. Testing direct Archive model query:');
    try {
      const directArchives = await Archive.findAll({
        order: [['created_at', 'DESC']]
      });
      console.log(`Direct Archive.findAll() returned: ${directArchives.length} archives`);
      
      if (directArchives.length > 0) {
        console.log('Archive types found:', [...new Set(directArchives.map(a => a.archive_type))]);
        console.log('Sample archive:', {
          id: directArchives[0].id,
          title: directArchives[0].title,
          archive_type: directArchives[0].archive_type
        });
      }
    } catch (error) {
      console.log('❌ Direct Archive model query failed:', error.message);
    }
    
    // Test 2: Check database service
    console.log('\n2. Testing database service:');
    try {
      const serviceArchives = await databaseService.getAllArchives();
      console.log(`databaseService.getAllArchives() returned: ${serviceArchives.length} archives`);
    } catch (error) {
      console.log('❌ Database service query failed:', error.message);
    }
    
    // Test 3: Raw SQL query to compare
    console.log('\n3. Testing raw SQL query:');
    try {
      const [rawResults] = await sequelize.query('SELECT id, title, archive_type FROM archives ORDER BY created_at DESC');
      console.log(`Raw SQL query returned: ${rawResults.length} archives`);
      
      if (rawResults.length > 0) {
        console.log('Raw archive types:', [...new Set(rawResults.map(a => a.archive_type))]);
      }
    } catch (error) {
      console.log('❌ Raw SQL query failed:', error.message);
    }
    
    // Test 4: Try to sync the model
    console.log('\n4. Attempting to sync Archive model:');
    try {
      await Archive.sync({ alter: true });
      console.log('✅ Archive model synced successfully');
      
      // Test again after sync
      const postSyncArchives = await Archive.findAll();
      console.log(`After sync, Archive.findAll() returned: ${postSyncArchives.length} archives`);
      
    } catch (error) {
      console.log('❌ Model sync failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testModelSync().then(() => {
  console.log('\n✅ Model sync test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});