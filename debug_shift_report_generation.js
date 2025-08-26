const axios = require('axios');

async function debugShiftReportGeneration() {
  try {
    console.log('🔍 Debugging Shift Report Generation Issues');
    console.log('=' .repeat(60));
    
    // Login first
    console.log('\n🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    console.log('✅ Login successful');
    
    // Get a specific shift to test with
    console.log('\n📊 Getting shifts...');
    const shiftsResponse = await axios.get('http://localhost:5000/api/shifts', {
      headers: authHeaders
    });
    
    const allShifts = shiftsResponse.data?.data || [];
    console.log(`Found ${allShifts.length} total shifts`);
    
    // Find any shift to test with (prefer completed, but use any if none completed)
    const completedShifts = allShifts.filter(shift => shift.status === 'COMPLETED');
    console.log(`Found ${completedShifts.length} completed shifts`);
    
    let testShift;
    if (completedShifts.length > 0) {
      testShift = completedShifts[0];
      console.log('Using completed shift for testing');
    } else if (allShifts.length > 0) {
      testShift = allShifts[0];
      console.log('No completed shifts found, using first available shift');
    } else {
      console.log('❌ No shifts found to test with');
      return;
    }
    console.log(`\n🧪 Testing report generation for Shift ${testShift.id}: ${testShift.shift_name}`);
    console.log(`   Status: ${testShift.status}`);
    console.log(`   Start: ${testShift.start_time}`);
    console.log(`   End: ${testShift.end_time}`);
    
    // Test the API endpoint with detailed error logging
    try {
      console.log(`\n📋 Calling POST /api/reports/shift/${testShift.id}/archive...`);
      
      const response = await axios.post(
        `http://localhost:5000/api/reports/shift/${testShift.id}/archive`,
        {},
        { 
          headers: authHeaders,
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log('✅ Report generation successful!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log('❌ Report generation failed');
      console.log('Error details:');
      console.log('  Status:', error.response?.status);
      console.log('  Status Text:', error.response?.statusText);
      console.log('  Error Message:', error.message);
      
      if (error.response?.data) {
        console.log('  Response Data:', JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.code) {
        console.log('  Error Code:', error.code);
      }
      
      // Check if it's a timeout
      if (error.code === 'ECONNABORTED') {
        console.log('  ⚠️  Request timed out - the server might be taking too long to process');
      }
    }
    
    // Also test with a different shift ID format (string vs number)
    console.log(`\n🧪 Testing with shift ID as string: '${testShift.id}'`);
    try {
      const response = await axios.post(
        `http://localhost:5000/api/reports/shift/${String(testShift.id)}/archive`,
        {},
        { 
          headers: authHeaders,
          timeout: 30000
        }
      );
      
      console.log('✅ String ID test successful!');
      
    } catch (error) {
      console.log('❌ String ID test failed with same error pattern');
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error.message);
  }
}

debugShiftReportGeneration();