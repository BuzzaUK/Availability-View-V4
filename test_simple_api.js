const axios = require('axios');

async function testSimpleAPI() {
  try {
    console.log('🔍 Testing Archives API endpoints...');
    
    // Login first
    console.log('\n1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test archives endpoint
    console.log('\n2. Testing /api/archives...');
    const archivesResponse = await axios.get('http://localhost:5000/api/archives', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Archives response:', {
      status: archivesResponse.status,
      success: archivesResponse.data.success,
      count: archivesResponse.data.count,
      total: archivesResponse.data.total,
      dataLength: archivesResponse.data.data ? archivesResponse.data.data.length : 0
    });
    
    // Test events/archives endpoint
    console.log('\n3. Testing /api/events/archives...');
    const eventsArchivesResponse = await axios.get('http://localhost:5000/api/events/archives', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Events archives response:', {
      status: eventsArchivesResponse.status,
      success: eventsArchivesResponse.data.success,
      count: eventsArchivesResponse.data.count,
      dataLength: eventsArchivesResponse.data.data ? eventsArchivesResponse.data.data.length : 0
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testSimpleAPI().then(() => {
  console.log('\n✅ Simple API test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});