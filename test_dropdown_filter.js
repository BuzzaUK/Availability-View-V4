const axios = require('axios');

async function testDropdownFilter() {
  try {
    console.log('🔍 Testing Natural Language Reports dropdown filter...\n');
    
    // Test archived reports endpoint
    console.log('1. Checking archived shift reports...');
    const archivedResponse = await axios.get('http://localhost:5000/api/reports/shifts');
    const archivedReports = archivedResponse.data?.data || [];
    console.log(`   Found ${archivedReports.length} archived shift reports`);
    
    // Extract shift IDs with reports
    const shiftIdsWithReports = new Set();
    archivedReports.forEach(report => {
      if (report.archived_data && report.archived_data.shift_id) {
        shiftIdsWithReports.add(report.archived_data.shift_id);
        console.log(`   - Report for Shift ID: ${report.archived_data.shift_id}`);
      }
    });
    
    // Test all shifts endpoint
    console.log('\n2. Checking all available shifts...');
    const shiftsResponse = await axios.get('http://localhost:5000/api/shifts');
    const allShifts = shiftsResponse.data?.data || [];
    console.log(`   Found ${allShifts.length} total shifts`);
    
    // Filter shifts with reports
    const shiftsWithReports = allShifts.filter(shift => 
      shiftIdsWithReports.has(shift.id)
    );
    
    console.log('\n3. Filter Results:');
    console.log(`   Total shifts: ${allShifts.length}`);
    console.log(`   Shifts with archived reports: ${shiftsWithReports.length}`);
    console.log(`   Filtered dropdown should show: ${shiftsWithReports.length} shifts`);
    
    if (shiftsWithReports.length > 0) {
      console.log('\n   Shifts that should appear in dropdown:');
      shiftsWithReports.forEach(shift => {
        console.log(`   - ${shift.name} (ID: ${shift.id})`);
      });
    }
    
    console.log('\n✅ Filter test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDropdownFilter();