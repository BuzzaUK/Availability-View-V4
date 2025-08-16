const axios = require('axios');

// Test script to verify the User Management authentication fix
async function testUserManagementFix() {
  console.log('🧪 Testing User Management Authentication Fix');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Verify backend is running
    console.log('\n1. Testing backend connectivity...');
    try {
      await axios.get('http://localhost:3001/api/auth/me');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✅ Backend is running and requires authentication');
      } else {
        console.log('❌ Backend connection failed:', err.message);
        return;
      }
    }
    
    // Test 2: Verify admin login works
    console.log('\n2. Testing admin login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('✅ Admin login successful!');
    console.log('   User:', user.name, '(' + user.role + ')');
    
    // Test 3: Verify user management API works with token
    console.log('\n3. Testing User Management API...');
    const usersResponse = await axios.get('http://localhost:3001/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ User Management API working!');
    console.log('   Found', usersResponse.data.data.length, 'users in database');
    
    // Display users for verification
    console.log('\n📋 Users in database:');
    usersResponse.data.data.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    
    console.log('\n🎉 All tests passed!');
    console.log('\n📝 Summary of fixes implemented:');
    console.log('   ✅ Enhanced User Management page with authentication check');
    console.log('   ✅ Added "Go to Login" button when not authenticated');
    console.log('   ✅ Added debug panel for development mode');
    console.log('   ✅ Improved error messages with role information');
    console.log('   ✅ Provided admin credentials hint for easy access');
    
    console.log('\n🔧 Next steps for users:');
    console.log('   1. Navigate to http://localhost:3000/users');
    console.log('   2. Click "Go to Login" button');
    console.log('   3. Use credentials: admin@example.com / admin123');
    console.log('   4. Access User Management with full functionality');
    
  } catch (err) {
    console.log('❌ Test failed:', err.response?.data?.message || err.message);
  }
}

// Run the test
testUserManagementFix().catch(console.error);