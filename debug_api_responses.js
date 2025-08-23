const axios = require('axios');

async function debugApiResponses() {
  try {
    console.log('=== Debugging API Response Structures ===\n');
    
    // Check archived shift reports API
    console.log('1. Testing /api/reports/shifts endpoint...');
    try {
      const archivedResponse = await axios.get('http://localhost:5000/api/reports/shifts');
      console.log('   Status:', archivedResponse.status);
      console.log('   Response structure:', Object.keys(archivedResponse.data));
      console.log('   Data type:', typeof archivedResponse.data);
      console.log('   Is array?', Array.isArray(archivedResponse.data));
      
      if (archivedResponse.data.data) {
        console.log('   Data.data type:', typeof archivedResponse.data.data);
        console.log('   Data.data is array?', Array.isArray(archivedResponse.data.data));
        console.log('   Data.data length:', archivedResponse.data.data?.length || 0);
      }
      
      // Show first archived report structure
      const archivedReports = archivedResponse.data?.data || archivedResponse.data || [];
      if (archivedReports.length > 0) {
        console.log('\n   First archived report structure:');
        console.log('   Keys:', Object.keys(archivedReports[0]));
        console.log('   Archive type:', archivedReports[0].archive_type);
        console.log('   Archived data keys:', Object.keys(archivedReports[0].archived_data || {}));
        if (archivedReports[0].archived_data) {
          console.log('   Shift ID in archived_data:', archivedReports[0].archived_data.shift_id);
        }
      }
    } catch (error) {
      console.log('   Error:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Response:', error.response.data);
      }
    }
    
    console.log('\n2. Testing /api/shifts endpoint...');
    try {
      const shiftsResponse = await axios.get('http://localhost:5000/api/shifts');
      console.log('   Status:', shiftsResponse.status);
      console.log('   Response structure:', Object.keys(shiftsResponse.data));
      console.log('   Data type:', typeof shiftsResponse.data);
      console.log('   Is array?', Array.isArray(shiftsResponse.data));
      
      if (shiftsResponse.data.data) {
        console.log('   Data.data type:', typeof shiftsResponse.data.data);
        console.log('   Data.data is array?', Array.isArray(shiftsResponse.data.data));
        console.log('   Data.data length:', shiftsResponse.data.data?.length || 0);
      }
      
      // Show first shift structure
      const allShifts = shiftsResponse.data?.data || shiftsResponse.data || [];
      if (allShifts.length > 0) {
        console.log('\n   First shift structure:');
        console.log('   Keys:', Object.keys(allShifts[0]));
        console.log('   ID:', allShifts[0].id);
        console.log('   Name:', allShifts[0].name);
        console.log('   Start time:', allShifts[0].start_time);
      }
    } catch (error) {
      console.log('   Error:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Response:', error.response.data);
      }
    }
    
    console.log('\n3. Testing frontend filtering logic simulation...');
    try {
      // Simulate the frontend logic
      const archivedResponse = await axios.get('http://localhost:5000/api/reports/shifts');
      const shiftsResponse = await axios.get('http://localhost:5000/api/shifts');
      
      // Try both possible data structures
      const archivedReports = archivedResponse.data?.data || archivedResponse.data || [];
      const allShifts = shiftsResponse.data?.data || shiftsResponse.data || [];
      
      console.log('   Archived reports count:', archivedReports.length);
      console.log('   All shifts count:', allShifts.length);
      
      // Extract shift IDs that have archived reports
      const shiftIdsWithReports = new Set();
      archivedReports.forEach(report => {
        if (report.archived_data && report.archived_data.shift_id) {
          shiftIdsWithReports.add(report.archived_data.shift_id);
          console.log('   Found shift ID in archive:', report.archived_data.shift_id);
        }
      });
      
      console.log('   Shift IDs with reports:', Array.from(shiftIdsWithReports));
      
      // Filter shifts
      const shiftsWithReports = allShifts.filter(shift => 
        shiftIdsWithReports.has(shift.id)
      );
      
      console.log('   Filtered shifts count:', shiftsWithReports.length);
      console.log('   Filtered shifts:', shiftsWithReports.map(s => ({ id: s.id, name: s.name })));
      
    } catch (error) {
      console.log('   Simulation error:', error.message);
    }
    
  } catch (error) {
    console.error('Debug failed:', error.message);
  }
}

debugApiResponses();