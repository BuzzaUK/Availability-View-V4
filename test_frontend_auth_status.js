const axios = require('axios');

// Test script to check frontend authentication status
async function testFrontendAuthStatus() {
  console.log('🔍 Testing Frontend Authentication Status');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Check if backend is running
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
    
    // Test 2: Try to login with admin credentials
    console.log('\n2. Testing admin login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('✅ Login successful!');
    console.log('   User:', user.name, '(' + user.role + ')');
    console.log('   Token (first 50 chars):', token.substring(0, 50) + '...');
    
    // Test 3: Test authenticated API calls
    console.log('\n3. Testing authenticated API calls...');
    
    // Test /api/auth/me
    const meResponse = await axios.get('http://localhost:3001/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ /api/auth/me successful:', meResponse.data.data.name, '(' + meResponse.data.data.role + ')');
    
    console.log('\n🎉 Backend authentication is working!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Open http://localhost:3000 in your browser');
    console.log('   2. Open browser console (F12)');
    console.log('   3. Look for 🔐 AuthContext logs');
    console.log('   4. If you see "No token found", click Login and use:');
    console.log('      Email: admin@example.com');
    console.log('      Password: admin123');
    console.log('   5. After login, check if "Shift: undefined" changes to show actual shift name');
    
  } catch (err) {
    console.log('❌ Authentication test failed:', err.response?.data?.message || err.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure backend is running on port 3001');
    console.log('   2. Check if admin user exists in database');
    console.log('   3. Verify password is correct');
  }
}

// Run the test
testFrontendAuthStatus().catch(console.error);