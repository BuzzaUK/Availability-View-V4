const axios = require('axios');

// Simple test to identify the API data serving issue
async function testAPISimple() {
  console.log('🔍 Testing API endpoint for Archive ID 1 issue...');
  
  const baseURL = 'http://localhost:5000';
  
  try {
    // Login first to get proper token
    console.log('\n=== Logging in ===');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Test the shift reports API endpoint
    console.log('\n=== Testing /api/reports/shifts ===');
    const response = await axios.get(`${baseURL}/api/reports/shifts`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Check if we're getting the problematic Archive ID 1
    if (response.data && response.data.data) {
      const reports = response.data.data;
      console.log(`\nFound ${reports.length} reports`);
      
      reports.forEach((report, index) => {
        console.log(`Report ${index + 1}:`);
        console.log(`  ID: ${report.id}`);
        console.log(`  Title: ${report.title}`);
        console.log(`  Duration: ${report.duration}`);
        console.log(`  End Time: ${report.end_time}`);
      });
      
      // Check for the problematic ID 1
      const problemReport = reports.find(r => r.id === 1);
      if (problemReport) {
        console.log('\n⚠️  FOUND PROBLEMATIC REPORT WITH ID 1:');
        console.log('This ID does not exist in the database!');
        console.log('Report details:', JSON.stringify(problemReport, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testAPISimple().catch(console.error);