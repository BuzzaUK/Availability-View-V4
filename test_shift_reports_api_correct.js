const axios = require('axios');

async function testShiftReportsAPI() {
  try {
    console.log('🔍 Testing Shift Reports API Response Structure');
    console.log('=' .repeat(50));
    
    // First login to get JWT token
    console.log('🔐 Step 1: Authenticating...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.token;
    
    // Make API call with JWT token (same as frontend)
    console.log('\n📊 Step 2: Calling /api/reports/shifts...');
    const response = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        page: 1,
        limit: 10
      }
    });
    
    console.log('\n📊 API Response Status:', response.status);
    console.log('📊 Response Structure:');
    console.log('  - success:', response.data.success);
    console.log('  - data (array length):', response.data.data?.length || 0);
    console.log('  - total:', response.data.total);
    console.log('  - pagination:', JSON.stringify(response.data.pagination, null, 2));
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📋 First Shift Report Data:');
      const firstReport = response.data.data[0];
      
      // Check all the fields the frontend expects
      const expectedFields = [
        'id', 'title', 'start_time', 'end_time', 'duration',
        'availability', 'performance', 'run_time', 'downtime', 'stops'
      ];
      
      console.log('  Expected fields check:');
      expectedFields.forEach(field => {
        const value = firstReport[field];
        const status = value !== undefined ? '✅' : '❌';
        console.log(`    ${status} ${field}: ${value}`);
      });
      
      console.log('\n  Full first report data:');
      console.log('   ', JSON.stringify(firstReport, null, 2));
    } else {
      console.log('\n❌ No shift reports returned');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testShiftReportsAPI().catch(console.error);