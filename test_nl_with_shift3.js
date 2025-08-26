const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');

// Database connection
const db = new sqlite3.Database('./database.sqlite');

async function testNaturalLanguageWithShift3() {
  try {
    console.log('=== Testing Natural Language API with Shift 3 ===\n');
    
    // Get user for JWT token
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = 1', (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
    
    if (!user) {
      console.log('❌ No user found');
      return;
    }
    
    console.log('✅ Found user:', user.email);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('✅ Generated JWT token');
    
    // Check shift 3 data first
    const shift3 = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM shifts WHERE id = 3', (err, shift) => {
        if (err) reject(err);
        else resolve(shift);
      });
    });
    
    console.log('\n📊 Shift 3 Data:');
    console.log('  Name:', shift3.shift_name);
    console.log('  Runtime:', shift3.total_runtime);
    console.log('  Stops:', shift3.total_stops);
    console.log('  Availability:', shift3.availability_percentage + '%');
    
    // Check events for shift 3
    const events = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM events WHERE shift_id = 3', (err, events) => {
        if (err) reject(err);
        else resolve(events);
      });
    });
    
    console.log('  Events:', events.length);
    if (events.length > 0) {
      console.log('  First event:', events[0].event_type, 'at', events[0].timestamp);
    }
    
    // Test the natural language API with shift 3
    console.log('\n🔍 Testing Natural Language API with Shift 3...');
    
    const response = await axios.post('http://localhost:5000/api/reports/natural-language/shift', {
      shift_id: 3,
      options: {
        includeRawData: false,
        useAI: false
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('\n📄 Natural Language Report:');
    
    if (response.data.narrative) {
      console.log('\n--- EXECUTIVE SUMMARY ---');
      console.log(response.data.narrative.executive_summary);
      
      console.log('\n--- SHIFT OVERVIEW ---');
      console.log(response.data.narrative.shift_overview);
      
      console.log('\n--- ASSET PERFORMANCE ---');
      console.log(response.data.narrative.asset_performance);
    }
    
    console.log('\n📊 Data Quality Score:', response.data.data_quality_score);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
  } finally {
    db.close();
  }
}

testNaturalLanguageWithShift3();