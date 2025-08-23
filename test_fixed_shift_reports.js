const axios = require('axios');

async function testFixedShiftReports() {
  try {
    console.log('=== Testing Fixed Shift Reports API ===\n');
    
    // First, login to get authentication token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      console.error('Login failed:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Set default authorization header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Test the shift reports endpoint
    console.log('\n2. Fetching shift reports...');
    const reportsResponse = await axios.get('http://localhost:5000/api/reports/shifts');
    
    console.log('API Response Status:', reportsResponse.status);
    console.log('API Response Success:', reportsResponse.data.success);
    console.log('Total Reports:', reportsResponse.data.total);
    
    if (reportsResponse.data.data && reportsResponse.data.data.length > 0) {
      console.log('\n3. Shift Report Details:');
      reportsResponse.data.data.forEach((report, index) => {
        console.log(`\n--- Report ${index + 1} ---`);
        console.log('ID:', report.id);
        console.log('Shift ID:', report.shift_id);
        console.log('Title:', report.title);
        console.log('Description:', report.description);
        console.log('Start Time:', report.start_time);
        console.log('End Time:', report.end_time);
        console.log('Duration:', report.duration, 'ms');
        console.log('Availability:', (report.availability * 100).toFixed(2) + '%');
        console.log('Performance:', (report.performance * 100).toFixed(2) + '%');
        console.log('Quality:', (report.quality * 100).toFixed(2) + '%');
        console.log('OEE:', (report.oee * 100).toFixed(2) + '%');
        console.log('Runtime:', report.runtime, 'minutes');
        console.log('Downtime:', report.downtime, 'minutes');
        console.log('Stops:', report.stops);
        console.log('Events Processed:', report.events_processed);
        console.log('Assets Analyzed:', report.assets_analyzed);
        
        // Test duration formatting (like the frontend does)
        const durationInMinutes = Math.round(report.duration / 60000);
        const hours = Math.floor(durationInMinutes / 60);
        const remainingMinutes = durationInMinutes % 60;
        const formattedDuration = hours > 0 ? `${hours}h ${remainingMinutes}m` : `${durationInMinutes}m`;
        console.log('Formatted Duration:', formattedDuration);
      });
    } else {
      console.log('\n❌ No shift reports found in API response');
    }
    
    // Also test the archives endpoint to see all archive types
    console.log('\n4. Testing archives endpoint...');
    const archivesResponse = await axios.get('http://localhost:5000/api/archives');
    
    console.log('Archives Response Status:', archivesResponse.status);
    console.log('Archives Response Success:', archivesResponse.data.success);
    console.log('Total Archives:', archivesResponse.data.total);
    
    if (archivesResponse.data.data && archivesResponse.data.data.length > 0) {
      console.log('\nArchive Types:');
      archivesResponse.data.data.forEach((archive, index) => {
        console.log(`${index + 1}. ID: ${archive.id}, Type: ${archive.archive_type}, Title: ${archive.title}`);
      });
    }
    
    console.log('\n=== Test completed ===');
    
  } catch (error) {
    console.error('Error testing shift reports:', error.response?.data || error.message);
  }
}

testFixedShiftReports();