const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');

async function debugSettingsAuth() {
  console.log('🔍 Debugging Settings Authentication Issues...');
  
  // First, let's check if there are any valid users in the database
  const db = new sqlite3.Database(dbPath);
  
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name, email, role FROM users LIMIT 5', [], (err, users) => {
      if (err) {
        console.error('❌ Database error:', err);
        db.close();
        return reject(err);
      }
      
      console.log('\n📊 Available Users:');
      users.forEach(user => {
        console.log(`  - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
      });
      
      db.close();
      
      // Now test authentication with the first user
      if (users.length > 0) {
        testAuthentication(users[0]);
      } else {
        console.log('❌ No users found in database');
      }
      
      resolve();
    });
  });
}

async function testAuthentication(user) {
  console.log('\n🔐 Testing Authentication Flow...');
  
  try {
    // Try to login with common passwords
    const passwords = ['admin123', 'password', 'admin', user.name];
    let token = null;
    
    for (const password of passwords) {
      try {
        console.log(`  Trying password: ${password}`);
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
          email: user.email,
          password: password
        });
        
        if (loginResponse.data.token) {
          token = loginResponse.data.token;
          console.log(`  ✅ Login successful with password: ${password}`);
          console.log(`  🎫 Token: ${token.substring(0, 20)}...`);
          break;
        }
      } catch (loginErr) {
        console.log(`  ❌ Login failed with password: ${password}`);
      }
    }
    
    if (!token) {
      console.log('❌ Could not authenticate with any common passwords');
      return;
    }
    
    // Test settings endpoint with valid token
    console.log('\n⚙️ Testing Settings Endpoint...');
    try {
      const settingsResponse = await axios.get('http://localhost:5000/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Settings fetch successful!');
      console.log('📋 Settings data:', JSON.stringify(settingsResponse.data, null, 2));
      
    } catch (settingsErr) {
      console.log('❌ Settings fetch failed:');
      console.log('  Status:', settingsErr.response?.status);
      console.log('  Message:', settingsErr.response?.data);
    }
    
    // Test notification settings endpoint
    console.log('\n🔔 Testing Notification Settings Endpoint...');
    try {
      const notificationResponse = await axios.get('http://localhost:5000/api/settings/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Notification settings fetch successful!');
      console.log('📋 Notification settings data:', JSON.stringify(notificationResponse.data, null, 2));
      
    } catch (notificationErr) {
      console.log('❌ Notification settings fetch failed:');
      console.log('  Status:', notificationErr.response?.status);
      console.log('  Message:', notificationErr.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
  }
}

// Run the debug
debugSettingsAuth().catch(console.error);