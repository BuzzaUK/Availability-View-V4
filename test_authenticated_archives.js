const axios = require('axios');

async function testWithAuthentication() {
  try {
    console.log('🔐 AUTHENTICATION TEST');
    console.log('=' .repeat(50));
    
    // 1. Login as admin
    console.log('\n1️⃣ Testing admin login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (loginResponse.data.success && loginResponse.data.token) {
      console.log('✅ Admin login successful');
      const token = loginResponse.data.token;
      
      // Set default authorization header
      const authHeaders = {
        'Authorization': `Bearer ${token}`
      };
      
      // 2. Test /api/archives endpoint
      console.log('\n2️⃣ Testing /api/archives endpoint...');
      try {
        const archivesResponse = await axios.get('http://localhost:5000/api/archives', {
          headers: authHeaders
        });
        console.log(`✅ /api/archives returned ${archivesResponse.data.data?.length || 0} archives`);
        console.log('Response structure:', JSON.stringify(archivesResponse.data, null, 2));
      } catch (err) {
        console.log(`❌ /api/archives failed: ${err.response?.data?.message || err.message}`);
      }
      
      // 3. Test /api/events/archives endpoint
      console.log('\n3️⃣ Testing /api/events/archives endpoint...');
      try {
        const eventArchivesResponse = await axios.get('http://localhost:5000/api/events/archives', {
          headers: authHeaders
        });
        console.log(`✅ /api/events/archives returned ${eventArchivesResponse.data.data?.length || 0} event archives`);
      } catch (err) {
        console.log(`❌ /api/events/archives failed: ${err.response?.data?.message || err.message}`);
      }
      
      // 4. Test /api/reports/shifts endpoint
      console.log('\n4️⃣ Testing /api/reports/shifts endpoint...');
      try {
        const shiftsResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
          headers: authHeaders
        });
        console.log(`✅ /api/reports/shifts returned ${shiftsResponse.data.data?.length || 0} shift reports`);
        console.log('Response structure:', JSON.stringify(shiftsResponse.data, null, 2));
      } catch (err) {
        console.log(`❌ /api/reports/shifts failed: ${err.response?.data?.message || err.message}`);
      }
      
      // 5. Test /api/analytics endpoint
      console.log('\n5️⃣ Testing /api/analytics endpoint...');
      try {
        const analyticsResponse = await axios.get('http://localhost:5000/api/analytics', {
          headers: authHeaders
        });
        console.log(`✅ /api/analytics successful`);
        console.log('Response structure:', JSON.stringify(analyticsResponse.data, null, 2));
      } catch (err) {
        console.log(`❌ /api/analytics failed: ${err.response?.data?.message || err.message}`);
      }
      
      // 6. Test API endpoint that doesn't exist
      console.log('\n6️⃣ Testing non-existent endpoint...');
      try {
        const nonExistentResponse = await axios.get('http://localhost:5000/api/nonexistent', {
          headers: authHeaders
        });
        console.log(`✅ /api/nonexistent returned unexpectedly`);
      } catch (err) {
        console.log(`✅ /api/nonexistent failed as expected: ${err.response?.status} ${err.response?.statusText}`);
      }
      
    } else {
      console.log('❌ Admin login failed');
      console.log('Response:', loginResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWithAuthentication();