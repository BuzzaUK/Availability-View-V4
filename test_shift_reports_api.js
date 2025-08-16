const axios = require('axios');

async function testShiftReportsAPI() {
  try {
    console.log('🔍 Testing Shift Reports API Endpoint');
    console.log('='.repeat(50));
    
    // First, login to get a valid token
    console.log('\n🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Test the shift reports endpoint
    console.log('\n📊 Fetching shift reports from /api/reports/shifts...');
    const response = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`\n📋 API Response Status: ${response.status}`);
    console.log(`📋 Response Success: ${response.data.success}`);
    
    if (response.data.success && response.data.data) {
      const shiftReports = response.data.data;
      console.log(`📋 Number of shift reports returned: ${shiftReports.length}`);
      console.log(`📋 Total available: ${response.data.total}`);
      
      if (shiftReports.length > 0) {
        console.log('\n📄 Shift Report Details:');
        shiftReports.forEach((report, index) => {
          console.log(`${index + 1}. ID: ${report.id}`);
          console.log(`   Title: ${report.title || report.name}`);
          console.log(`   Archive Type: ${report.archive_type}`);
          console.log(`   Status: ${report.status}`);
          console.log(`   Created: ${report.created_at}`);
          console.log(`   Start Time: ${report.start_time}`);
          console.log(`   End Time: ${report.end_time}`);
          console.log(`   Events Processed: ${report.events_processed}`);
          console.log(`   Assets Analyzed: ${report.assets_analyzed}`);
          console.log('   ---');
        });
        
        // Verify all returned reports are SHIFT_REPORT type
        const allShiftReports = shiftReports.every(report => report.archive_type === 'SHIFT_REPORT');
        console.log(`\n✅ All returned reports are SHIFT_REPORT type: ${allShiftReports}`);
        
        if (!allShiftReports) {
          console.log('❌ Found non-SHIFT_REPORT types:');
          shiftReports.forEach(report => {
            if (report.archive_type !== 'SHIFT_REPORT') {
              console.log(`   - ${report.title}: ${report.archive_type}`);
            }
          });
        }
      } else {
        console.log('\n⚠️  No shift reports found in the response');
      }
    } else {
      console.log('❌ API request failed or returned no data');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

testShiftReportsAPI();