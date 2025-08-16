const axios = require('axios');

// Test the user management API
async function testUserAPI() {
  try {
    console.log('🔍 Testing User Management API...');
    
    // Test backend connectivity
    console.log('\n1. Testing backend connectivity...');
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Backend is running:', healthResponse.data);
    
    // Test admin login
    console.log('\n2. Testing admin login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    console.log('✅ Admin login successful');
    const token = loginResponse.data.token;
    
    // Test users API with authentication
    console.log('\n3. Testing users API...');
    const usersResponse = await axios.get('http://localhost:5000/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Users API Response Structure:');
    console.log('   - Success:', usersResponse.data.success);
    console.log('   - Data type:', typeof usersResponse.data.data);
    console.log('   - Data length:', usersResponse.data.data?.length || 0);
    console.log('   - Pagination:', usersResponse.data.pagination);
    
    if (usersResponse.data.data && usersResponse.data.data.length > 0) {
      console.log('\n📋 Users found:');
      usersResponse.data.data.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    } else {
      console.log('⚠️ No users found in response');
    }
    
    console.log('\n🎉 User API test completed successfully!');
    
  } catch (err) {
    console.log('❌ Test failed:', err.response?.data?.message || err.message);
    if (err.response?.data) {
      console.log('❌ Error details:', err.response.data);
    }
  }
}

// Run the test
testUserAPI().catch(console.error);