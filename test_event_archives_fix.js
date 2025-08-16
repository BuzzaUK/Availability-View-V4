const axios = require('axios');

async function testEventArchivesFix() {
  try {
    console.log('🧪 Testing Event Archives API fix...');
    
    // First, login to get a valid token
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Test the /api/events/archives endpoint
    const response = await axios.get('http://localhost:3001/api/events/archives', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n📊 Event Archives API Response:');
    console.log('Success:', response.data.success);
    console.log('Number of archives returned:', response.data.data.length);
    
    if (response.data.data.length > 0) {
      console.log('\n📋 Archive details:');
      response.data.data.forEach((archive, index) => {
        console.log(`${index + 1}. ID: ${archive.id}, Type: ${archive.archive_type}, Title: ${archive.title}`);
      });
    }
    
    console.log('\n✅ Fix verification:');
    const allEventsType = response.data.data.every(archive => archive.archive_type === 'EVENTS');
    if (allEventsType) {
      console.log('✅ SUCCESS: All returned archives are EVENTS type');
      console.log('✅ The synchronization fix is working correctly!');
    } else {
      console.log('❌ ISSUE: Some archives are not EVENTS type');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

testEventArchivesFix();