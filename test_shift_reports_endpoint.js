const axios = require('axios');

async function testShiftReportsEndpoint() {
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
    console.log(`📋 Number of shift reports returned: ${response.data.data?.length || 0}`);
    console.log(`📋 Total available: ${response.data.total || 0}`);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📄 First Shift Report Details:');
      const firstReport = response.data.data[0];
      console.log(`   ID: ${firstReport.id}`);
      console.log(`   Title: ${firstReport.title}`);
      console.log(`   Archive Type: ${firstReport.archive_type}`);
      console.log(`   Shift ID: ${firstReport.shift_id}`);
      console.log(`   Start Time: ${firstReport.start_time}`);
      console.log(`   End Time: ${firstReport.end_time}`);
      console.log(`   Status: ${firstReport.status}`);
    } else {
      console.log('\n❌ No shift reports found!');
      console.log('\nThis explains why the Archive page is empty.');
    }
    
    // Also check what archives exist in the database
    console.log('\n\n🗄️ Checking all archives in database...');
    const archivesResponse = await axios.get('http://localhost:5000/api/archives', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`\n📦 Total archives in database: ${archivesResponse.data.data?.length || 0}`);
    
    if (archivesResponse.data.data && archivesResponse.data.data.length > 0) {
      const archiveTypes = {};
      archivesResponse.data.data.forEach(archive => {
        archiveTypes[archive.archive_type] = (archiveTypes[archive.archive_type] || 0) + 1;
      });
      
      console.log('\n📊 Archive Types Breakdown:');
      Object.entries(archiveTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      
      // Show SHIFT_REPORT archives specifically
      const shiftReportArchives = archivesResponse.data.data.filter(a => a.archive_type === 'SHIFT_REPORT');
      console.log(`\n🎯 SHIFT_REPORT archives: ${shiftReportArchives.length}`);
      
      if (shiftReportArchives.length > 0) {
        console.log('\n📋 SHIFT_REPORT Archive Details:');
        shiftReportArchives.forEach((archive, index) => {
          console.log(`   ${index + 1}. ${archive.title} (ID: ${archive.id})`);
          console.log(`      Created: ${archive.created_at}`);
          console.log(`      Status: ${archive.status}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testShiftReportsEndpoint();