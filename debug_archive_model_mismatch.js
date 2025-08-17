const databaseService = require('./src/backend/services/databaseService');
const { sequelize } = require('./src/backend/config/database');

async function debugArchiveModelMismatch() {
  try {
    console.log('🔍 Debugging Archive Model vs Database Mismatch...');
    
    // First, let's check what's actually in the database using raw SQL
    console.log('\n1. Raw SQL query to check archives table:');
    const [results] = await sequelize.query('SELECT id, title, archive_type, status, created_at FROM archives ORDER BY created_at DESC');
    
    console.log(`Found ${results.length} archives in database:`);
    results.forEach((archive, index) => {
      console.log(`  ${index + 1}. ID: ${archive.id}, Type: ${archive.archive_type}, Title: ${archive.title}`);
    });
    
    // Check what archive types exist
    const archiveTypes = [...new Set(results.map(a => a.archive_type))];
    console.log('\nArchive types found in database:', archiveTypes);
    
    // Now test the Sequelize model
    console.log('\n2. Testing Sequelize Archive model:');
    try {
      const modelArchives = await databaseService.getAllArchives();
      console.log(`Sequelize model returned ${modelArchives.length} archives`);
      
      if (modelArchives.length !== results.length) {
        console.log('❌ MISMATCH: Raw SQL and Sequelize model return different counts!');
        console.log(`  Raw SQL: ${results.length} archives`);
        console.log(`  Sequelize: ${modelArchives.length} archives`);
        
        // Check if there are any validation errors
        console.log('\n3. Checking for validation errors...');
        
        // Try to find archives one by one
        for (const rawArchive of results) {
          try {
            const modelArchive = await databaseService.findArchiveById(rawArchive.id);
            if (!modelArchive) {
              console.log(`❌ Archive ID ${rawArchive.id} (type: ${rawArchive.archive_type}) not found by Sequelize model`);
            }
          } catch (error) {
            console.log(`❌ Error fetching archive ID ${rawArchive.id}: ${error.message}`);
          }
        }
      } else {
        console.log('✅ Raw SQL and Sequelize model return same count');
      }
      
    } catch (error) {
      console.log('❌ Error with Sequelize model:', error.message);
    }
    
    // Check the Archive model definition
    console.log('\n4. Archive model enum definition:');
    const Archive = require('./src/backend/models/database/Archive');
    const archiveTypeEnum = Archive.rawAttributes.archive_type.values;
    console.log('Allowed archive_type values:', archiveTypeEnum);
    
    // Check for mismatches
    const invalidTypes = archiveTypes.filter(type => !archiveTypeEnum.includes(type));
    if (invalidTypes.length > 0) {
      console.log('\n❌ FOUND THE ISSUE!');
      console.log('Invalid archive types in database (not in model enum):', invalidTypes);
      console.log('\n💡 SOLUTION:');
      console.log('Either:');
      console.log('1. Update the Archive model enum to include these types');
      console.log('2. Update the database records to use valid enum values');
    } else {
      console.log('\n✅ All archive types in database match the model enum');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  }
}

debugArchiveModelMismatch().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});