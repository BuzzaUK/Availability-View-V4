const axios = require('axios');

// Debug script to test frontend authentication state
async function debugFrontendAuth() {
  console.log('🔍 Debugging Frontend Authentication State');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Check if backend is running
    console.log('\n1. Testing backend connectivity...');
    const healthCheck = await axios.get('http://localhost:3001/api/auth/me');
    console.log('❌ Backend requires authentication (expected)');
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
  try {
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('✅ Login successful!');
    console.log('User:', JSON.stringify(user, null, 2));
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
    
    // Test 3: Test authenticated API calls
    console.log('\n3. Testing authenticated API calls...');
    
    // Test /api/auth/me
    const meResponse = await axios.get('http://localhost:3001/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ /api/auth/me successful:', meResponse.data.data.name, '(' + meResponse.data.data.role + ')');
    
    // Test /api/users
    const usersResponse = await axios.get('http://localhost:3001/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ /api/users successful: Found', usersResponse.data.data.length, 'users');
    
    console.log('\n🎉 All backend authentication tests passed!');
    console.log('\n💡 Issue: Frontend needs to be logged in with this token');
    console.log('\n🔧 Solutions:');
    console.log('   1. User needs to log in through the login page');
    console.log('   2. Or we can implement auto-login for development');
    console.log('   3. Or we can add a login prompt to the User Management page');
    
  } catch (err) {
    console.log('❌ Login failed:', err.response?.data?.message || err.message);
    console.log('\n🔍 Available users in database:');
    
    // Show available users
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./database.sqlite');
    
    db.all('SELECT id, name, email, role FROM users', (err, rows) => {
      if (err) {
        console.error('Database error:', err);
      } else {
        console.table(rows);
        console.log('\n💡 Try logging in with one of these accounts');
        console.log('   Default password might be: admin123, password, or 123456');
      }
      db.close();
    });
  }
}

// Run the debug script
debugFrontendAuth().catch(console.error);