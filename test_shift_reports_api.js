const axios = require('axios');

async function testShiftReportsAPI() {
  try {
    console.log('🔐 Logging in...');
    
    // Login to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Fetch shift reports with authentication
    console.log('📊 Fetching shift reports...');
    const reportsResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const reports = reportsResponse.data.data || reportsResponse.data;
    console.log(`\n📋 Found ${reports.length} shift reports:\n`);
    
    reports.forEach((report, index) => {
      console.log(`${index + 1}. ${report.title}`);
      console.log(`   Start: ${report.start_time}`);
      console.log(`   End: ${report.end_time}`);
      console.log(`   Performance: ${report.performance ? (report.performance * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`   Runtime: ${report.runtime || 'N/A'} minutes`);
      console.log(`   Downtime: ${report.downtime || 'N/A'} minutes`);
      console.log(`   Availability: ${report.availability ? (report.availability * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`   OEE: ${report.oee ? (report.oee * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`   Stops: ${report.stops || 'N/A'}`);
      console.log(`   Events Processed: ${report.events_processed || 'N/A'}`);
      console.log(`   Assets Analyzed: ${report.assets_analyzed || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testShiftReportsAPI();