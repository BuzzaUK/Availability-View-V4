const axios = require('axios');
const databaseService = require('./src/backend/services/databaseService');

async function testApiArchives() {
  try {
    console.log('🔍 Testing API Archives Endpoints...');
    
    // First, check what's in the database directly
    console.log('\n1. Direct database check:');
    const allArchives = await databaseService.getAllArchives();
    console.log(`Database contains ${allArchives.length} archives`);
    
    if (allArchives.length > 0) {
      console.log('Archive types:', [...new Set(allArchives.map(a => a.archive_type))]);
      console.log('Sample archive:', {
        id: allArchives[0].id,
        title: allArchives[0].title,
        archive_type: allArchives[0].archive_type,
        created_at: allArchives[0].created_at
      });
    }
    
    // Now test the API endpoint
    console.log('\n2. Testing API endpoint with authentication:');
    
    // Login first to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.token;
      console.log('✅ Login successful, token obtained');
      
      // Test /api/archives endpoint
      try {
        const archivesResponse = await axios.get('http://localhost:5000/api/archives', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('✅ /api/archives response:');
        console.log(`  Status: ${archivesResponse.status}`);
        console.log(`  Success: ${archivesResponse.data.success}`);
        console.log(`  Count: ${archivesResponse.data.count}`);
        console.log(`  Total: ${archivesResponse.data.total}`);
        console.log(`  Data length: ${archivesResponse.data.data?.length || 0}`);
        
        if (archivesResponse.data.data && archivesResponse.data.data.length > 0) {
          console.log('  Sample archive from API:', {
            id: archivesResponse.data.data[0].id,
            title: archivesResponse.data.data[0].title,
            archive_type: archivesResponse.data.data[0].archive_type
          });
        }
        
      } catch (apiError) {
        console.log('❌ /api/archives failed:');
        console.log(`  Status: ${apiError.response?.status}`);
        console.log(`  Message: ${apiError.response?.data?.message || apiError.message}`);
        console.log(`  Error: ${apiError.response?.data?.error}`);
      }
      
      // Test /api/events/archives endpoint
      try {
        const eventArchivesResponse = await axios.get('http://localhost:5000/api/events/archives', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('\n✅ /api/events/archives response:');
        console.log(`  Status: ${eventArchivesResponse.status}`);
        console.log(`  Success: ${eventArchivesResponse.data.success}`);
        console.log(`  Count: ${eventArchivesResponse.data.count}`);
        console.log(`  Data length: ${eventArchivesResponse.data.data?.length || 0}`);
        
      } catch (apiError) {
        console.log('❌ /api/events/archives failed:');
        console.log(`  Status: ${apiError.response?.status}`);
        console.log(`  Message: ${apiError.response?.data?.message || apiError.message}`);
      }
      
    } else {
      console.log('❌ Login failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testApiArchives().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});