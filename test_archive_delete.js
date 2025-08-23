const axios = require('axios');
const databaseService = require('./src/backend/services/databaseService');

// Disable SQL logging for cleaner output
const { sequelize } = require('./src/backend/models/database');
sequelize.options.logging = false;

async function getAuthToken() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    return response.data.token;
  } catch (error) {
    console.log('❌ Failed to get auth token:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testArchiveDelete() {
  console.log('🧪 TESTING EVENT ARCHIVE DELETE FUNCTIONALITY');
  console.log('=' .repeat(50));
  
  try {
    // 1. Get all event archives first
    console.log('\n📊 STEP 1: Getting all event archives');
    const archives = await databaseService.getAllArchives();
    const eventArchives = archives.filter(archive => archive.archive_type === 'EVENTS');
    
    console.log(`Found ${eventArchives.length} event archives:`);
    eventArchives.forEach((archive, index) => {
      console.log(`  ${index + 1}. ID: ${archive.id}, Title: ${archive.title}`);
      console.log(`     Created: ${archive.created_at}`);
      console.log(`     Event Count: ${archive.archived_data ? 
        (typeof archive.archived_data === 'string' ? 
          JSON.parse(archive.archived_data).event_count : 
          archive.archived_data.event_count) : 'N/A'}`);
    });
    
    if (eventArchives.length === 0) {
      console.log('❌ No event archives found to test delete functionality');
      return;
    }
    
    // 2. Get authentication token
    console.log('\n🔐 STEP 2: Getting authentication token');
    const token = await getAuthToken();
    
    if (!token) {
      console.log('❌ Cannot get authentication token - testing direct database delete instead');
      
      // Test database delete directly
      console.log('\n🔧 STEP 2B: Testing database delete directly');
      const testArchive = eventArchives[eventArchives.length - 1];
      console.log(`Testing delete for archive: ${testArchive.title} (ID: ${testArchive.id})`);
      
      const deleted = await databaseService.deleteArchive(testArchive.id);
      
      if (deleted) {
        console.log('✅ Direct database delete successful');
        
        // Verify deletion
        const updatedArchives = await databaseService.getAllArchives();
        const deletedArchiveExists = updatedArchives.find(archive => archive.id === testArchive.id);
        
        if (!deletedArchiveExists) {
          console.log('✅ Archive successfully deleted from database');
        } else {
          console.log('❌ Archive still exists in database - delete failed');
        }
      } else {
        console.log('❌ Direct database delete failed');
      }
      
    } else {
      console.log('✅ Authentication token obtained');
      
      // 3. Test the delete API endpoint with authentication
      console.log('\n🗑️ STEP 3: Testing delete API endpoint with authentication');
      const testArchive = eventArchives[eventArchives.length - 1]; // Get the most recent one
      console.log(`Testing delete for archive: ${testArchive.title} (ID: ${testArchive.id})`);
      
      try {
        const response = await axios.delete(`http://localhost:5000/api/events/archives/${testArchive.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          console.log('✅ Delete API call successful');
          console.log(`   Message: ${response.data.message}`);
          
          // 4. Verify the archive was actually deleted
          console.log('\n🔍 STEP 4: Verifying archive was deleted from database');
          const updatedArchives = await databaseService.getAllArchives();
          const deletedArchiveExists = updatedArchives.find(archive => archive.id === testArchive.id);
          
          if (!deletedArchiveExists) {
            console.log('✅ Archive successfully deleted from database');
          } else {
            console.log('❌ Archive still exists in database - delete failed');
          }
          
        } else {
          console.log('❌ Delete API call failed');
          console.log(`   Message: ${response.data.message}`);
        }
        
      } catch (apiError) {
        if (apiError.code === 'ECONNREFUSED') {
          console.log('❌ Cannot connect to backend server on port 5000');
          console.log('   Backend server may not be running');
        } else {
          console.log('❌ API Error:', apiError.response?.data || apiError.message);
        }
      }
    }
    
    // 5. Final state check
    console.log('\n📊 STEP 5: Final archive count');
    const finalArchives = await databaseService.getAllArchives();
    const finalEventArchives = finalArchives.filter(archive => archive.archive_type === 'EVENTS');
    console.log(`Final event archives count: ${finalEventArchives.length}`);
    
    console.log('\n✅ Delete functionality test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testArchiveDelete().catch(console.error);