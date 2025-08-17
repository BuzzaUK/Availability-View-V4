const axios = require('axios');
const databaseService = require('./src/backend/services/databaseService');
const { sequelize } = require('./src/backend/config/database');

/**
 * Test Archives API endpoints after database patch
 */
async function testArchivesEndpoints() {
  try {
    console.log('🧪 Testing Archives API endpoints...');
    
    const baseURL = 'http://localhost:5000';
    
    // Test 1: Direct database query for archives
    console.log('\n1️⃣ Testing direct database access...');
    const allArchives = await databaseService.getAllArchives();
    console.log(`Found ${allArchives.length} total archives in database`);
    
    // Filter for event archives
    const eventArchives = allArchives.filter(archive => 
      archive.archive_type === 'EVENTS' || 
      (archive.archived_data && Array.isArray(archive.archived_data))
    );
    console.log(`Found ${eventArchives.length} event archives`);
    
    if (eventArchives.length > 0) {
      console.log('Sample event archive:', {
        id: eventArchives[0].id,
        title: eventArchives[0].title,
        archive_type: eventArchives[0].archive_type,
        created_at: eventArchives[0].created_at,
        event_count: Array.isArray(eventArchives[0].archived_data) ? eventArchives[0].archived_data.length : 'N/A'
      });
    }
    
    // Test 2: Archives API endpoint (without auth)
    console.log('\n2️⃣ Testing /api/archives endpoint...');
    try {
      const response = await axios.get(`${baseURL}/api/archives`);
      console.log('✅ /api/archives accessible');
      console.log('Response structure:', {
        success: response.data.success,
        dataLength: response.data.data?.length || 0,
        pagination: response.data.pagination
      });
    } catch (error) {
      console.log('❌ /api/archives error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 3: Event Archives API endpoint (without auth)
    console.log('\n3️⃣ Testing /api/events/archives endpoint...');
    try {
      const response = await axios.get(`${baseURL}/api/events/archives`);
      console.log('✅ /api/events/archives accessible');
      console.log('Response structure:', {
        success: response.data.success,
        dataLength: response.data.data?.length || 0
      });
    } catch (error) {
      console.log('❌ /api/events/archives error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 4: Shift Reports API endpoint (without auth)
    console.log('\n4️⃣ Testing /api/reports/shifts endpoint...');
    try {
      const response = await axios.get(`${baseURL}/api/reports/shifts`);
      console.log('✅ /api/reports/shifts accessible');
      console.log('Response structure:', {
        success: response.data.success,
        dataLength: response.data.data?.length || 0
      });
    } catch (error) {
      console.log('❌ /api/reports/shifts error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 5: Check notification settings endpoints
    console.log('\n5️⃣ Testing notification settings endpoints...');
    try {
      const response1 = await axios.get(`${baseURL}/api/settings/notifications`);
      console.log('✅ /api/settings/notifications accessible');
      console.log('Shift times:', response1.data?.shiftSettings?.shiftTimes);
    } catch (error) {
      console.log('❌ /api/settings/notifications error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    try {
      const response2 = await axios.get(`${baseURL}/api/notifications/settings`);
      console.log('✅ /api/notifications/settings accessible');
      console.log('Shift times:', response2.data?.data?.shiftSettings?.shiftTimes || response2.data?.shiftSettings?.shiftTimes);
    } catch (error) {
      console.log('❌ /api/notifications/settings error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 6: Check if authentication is the issue
    console.log('\n6️⃣ Checking authentication requirements...');
    
    // Check if there are any users in the system
    const users = await databaseService.getAllUsers();
    console.log(`Found ${users.length} users in system`);
    
    if (users.length > 0) {
      console.log('Sample user:', {
        id: users[0].id,
        email: users[0].email,
        role: users[0].role,
        is_active: users[0].is_active
      });
    }
    
    console.log('\n✅ Archives endpoints testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing archives endpoints:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testArchivesEndpoints();