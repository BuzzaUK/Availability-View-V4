const axios = require('axios');

async function checkShift74Data() {
  try {
    console.log('Checking shift 74 raw data...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Check if shift 74 exists in regular reports
    console.log('\n📊 Checking regular shift report for shift 74...');
    try {
      const shiftResponse = await axios.get('http://localhost:5000/api/reports/shift/74', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Regular shift report found');
      console.log('Shift name:', shiftResponse.data.shift?.shift_name || shiftResponse.data.shift?.name);
      console.log('Start time:', shiftResponse.data.shift?.start_time);
      console.log('End time:', shiftResponse.data.shift?.end_time);
      console.log('Duration hours:', shiftResponse.data.shift?.duration_hours);
      console.log('Assets count:', shiftResponse.data.assets?.length || 0);
      console.log('Events count:', shiftResponse.data.events?.length || 0);
      
      if (shiftResponse.data.assets && shiftResponse.data.assets.length > 0) {
        console.log('\n📋 Asset details:');
        shiftResponse.data.assets.forEach((asset, index) => {
          console.log(`${index + 1}. ${asset.asset_name || asset.name}: ${asset.availability || 0}% availability`);
        });
      }
      
    } catch (shiftError) {
      console.log('❌ Regular shift report error:', shiftError.response?.status, shiftError.response?.data?.message);
    }
    
    // Check archived reports
    console.log('\n📋 Checking archived reports...');
    const archiveResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Total archived reports:', archiveResponse.data.shiftReports?.length || 0);
    
    if (archiveResponse.data.shiftReports) {
      const shift74Archive = archiveResponse.data.shiftReports.find(r => r.shift_id === 74);
      if (shift74Archive) {
        console.log('✅ Found shift 74 in archives');
        console.log('Archive title:', shift74Archive.title);
        console.log('Archive type:', shift74Archive.archive_type);
      } else {
        console.log('❌ Shift 74 not found in archives');
        console.log('Available shift IDs:', archiveResponse.data.shiftReports.map(r => r.shift_id));
      }
    }
    
  } catch (error) {
    console.error('Error checking shift 74 data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

checkShift74Data();