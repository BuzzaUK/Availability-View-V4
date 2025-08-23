const axios = require('axios');

async function checkArchivedReports() {
  try {
    console.log('=== Checking Archived Shift Reports ===');
    
    // Check archived shift reports
    const archivedResponse = await axios.get('http://localhost:5000/api/reports/shifts');
    console.log('\nArchived Shift Reports:');
    console.log('Count:', archivedResponse.data.length);
    
    archivedResponse.data.forEach((report, index) => {
      console.log(`\n--- Report ${index + 1} ---`);
      console.log('ID:', report.id);
      console.log('Archive Type:', report.archive_type);
      console.log('Created At:', report.created_at);
      console.log('Archived Data Keys:', Object.keys(report.archived_data || {}));
      
      if (report.archived_data) {
        console.log('Shift ID from archived_data:', report.archived_data.shift_id);
        console.log('Shift Name:', report.archived_data.shift_name);
        console.log('Start Time:', report.archived_data.start_time);
        console.log('End Time:', report.archived_data.end_time);
      }
    });
    
    // Check all available shifts
    console.log('\n\n=== Checking All Available Shifts ===');
    const shiftsResponse = await axios.get('http://localhost:5000/api/shifts');
    console.log('\nAll Shifts:');
    console.log('Count:', shiftsResponse.data.length);
    
    shiftsResponse.data.forEach((shift, index) => {
      console.log(`\n--- Shift ${index + 1} ---`);
      console.log('ID:', shift.id);
      console.log('Name:', shift.name);
      console.log('Start Time:', shift.start_time);
      console.log('End Time:', shift.end_time);
      console.log('Active:', shift.active);
    });
    
    // Check which shifts have archived reports
    console.log('\n\n=== Matching Analysis ===');
    const archivedShiftIds = archivedResponse.data
      .filter(report => report.archive_type === 'SHIFT_REPORT' && report.archived_data?.shift_id)
      .map(report => report.archived_data.shift_id);
    
    console.log('Shift IDs with archived reports:', archivedShiftIds);
    
    const matchingShifts = shiftsResponse.data.filter(shift => 
      archivedShiftIds.includes(shift.id)
    );
    
    console.log('\nShifts that should appear in NL dropdown:');
    matchingShifts.forEach(shift => {
      console.log(`- ID: ${shift.id}, Name: ${shift.name}, Times: ${shift.start_time} - ${shift.end_time}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

checkArchivedReports();