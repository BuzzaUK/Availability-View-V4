const axios = require('axios');

async function testDurationDebug() {
  try {
    console.log('=== Testing Duration Debug ===\n');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Get shift reports
    const reportsResponse = await axios.get('http://localhost:5000/api/reports/shifts');
    
    console.log('Raw API Response:');
    console.log(JSON.stringify(reportsResponse.data, null, 2));
    
    if (reportsResponse.data.data && reportsResponse.data.data.length > 0) {
      const report = reportsResponse.data.data[0];
      console.log('\n=== Duration Analysis ===');
      console.log('Duration field:', report.duration);
      console.log('Duration type:', typeof report.duration);
      console.log('Start Time:', report.start_time);
      console.log('End Time:', report.end_time);
      
      if (report.start_time && report.end_time) {
        const start = new Date(report.start_time);
        const end = new Date(report.end_time);
        const calculatedDuration = end - start;
        console.log('Calculated Duration from dates:', calculatedDuration, 'ms');
      } else {
        console.log('Cannot calculate duration - missing start or end time');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testDurationDebug();