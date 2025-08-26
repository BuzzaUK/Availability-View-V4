const axios = require('axios');

async function testShiftReportsAPI() {
  try {
    console.log('🔍 Testing Shift Reports API Response Structure');
    console.log('=' .repeat(50));
    
    // First login to get session
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    console.log('✅ Login successful');
    
    // Get the session cookie
    const cookies = loginResponse.headers['set-cookie'];
    const sessionCookie = cookies ? cookies.find(cookie => cookie.startsWith('connect.sid')) : null;
    
    // Make API call with session cookie
    const response = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: {
        'Cookie': sessionCookie || ''
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
        'availability', 'performance', 'runtime', 'downtime', 'stops'
      ];
      
      expectedFields.forEach(field => {
        console.log(`  - ${field}:`, firstReport[field]);
      });
      
      console.log('\n📋 All Available Fields:');
      Object.keys(firstReport).forEach(key => {
        console.log(`  - ${key}:`, typeof firstReport[key], firstReport[key]);
      });
      
      // Check if the data looks correct
      console.log('\n🔍 Data Validation:');
      console.log('  - Has valid ID:', !!firstReport.id);
      console.log('  - Has title:', !!firstReport.title);
      console.log('  - Has start_time:', !!firstReport.start_time);
      console.log('  - Has end_time:', !!firstReport.end_time);
      console.log('  - Runtime is number:', typeof firstReport.runtime === 'number');
      console.log('  - Downtime is number:', typeof firstReport.downtime === 'number');
      console.log('  - Availability is number:', typeof firstReport.availability === 'number');
      console.log('  - Performance is number:', typeof firstReport.performance === 'number');
      
    } else {
      console.log('\n❌ No shift reports returned in data array!');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testShiftReportsAPI().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});