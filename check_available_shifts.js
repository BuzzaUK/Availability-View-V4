const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkAvailableShifts() {
  try {
    console.log('Checking available shifts...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Check archived reports
    console.log('\n📋 Checking archived reports...');
    const archiveResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Total archived reports:', archiveResponse.data.shiftReports?.length || 0);
    
    if (archiveResponse.data.shiftReports && archiveResponse.data.shiftReports.length > 0) {
      console.log('\nAvailable archived shifts:');
      archiveResponse.data.shiftReports.forEach((report, index) => {
        console.log(`${index + 1}. Shift ID: ${report.shift_id}, Title: ${report.title}`);
      });
    }
    
    // Check database directly for shifts
    console.log('\n🗄️ Checking database directly for shifts...');
    const dbPath = path.join(__dirname, 'database.sqlite');
    const db = new sqlite3.Database(dbPath);
    
    db.all('SELECT id, shift_name, start_time, end_time FROM shifts ORDER BY id DESC LIMIT 10', (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
      } else {
        console.log('\nShifts in database:');
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ID: ${row.id}, Name: ${row.shift_name}, Start: ${row.start_time}, End: ${row.end_time}`);
        });
        
        // Test natural language report with an existing shift
        if (rows.length > 0) {
          const firstShift = rows[0];
          console.log(`\n🧪 Testing natural language report with shift ${firstShift.id}...`);
          testNaturalLanguageReport(token, firstShift.id);
        }
      }
      db.close();
    });
    
  } catch (error) {
    console.error('Error checking available shifts:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

async function testNaturalLanguageReport(token, shiftId) {
  try {
    const response = await axios.get(`http://localhost:5000/api/reports/natural-language/shift/${shiftId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`✅ Natural language report generated for shift ${shiftId}`);
    console.log('Report type:', response.data.report_type);
    console.log('Success:', response.data.success);
    
    if (response.data.narrative) {
      const narrative = response.data.narrative;
      console.log('\nNarrative sections:');
      Object.keys(narrative).forEach(section => {
        const content = narrative[section];
        if (content && typeof content === 'string') {
          console.log(`- ${section}: ${content.length} characters`);
        } else {
          console.log(`- ${section}: [${typeof content}]`);
        }
      });
    }
    
  } catch (error) {
    console.error(`❌ Error testing natural language report for shift ${shiftId}:`, error.response?.status, error.response?.data?.message);
  }
}

checkAvailableShifts();