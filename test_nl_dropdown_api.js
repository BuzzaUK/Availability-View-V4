const axios = require('axios');

async function testNLDropdownAPI() {
  try {
    console.log('🔍 Testing Natural Language Dropdown API Logic');
    console.log('=' .repeat(60));
    
    // Login first to get authentication token
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
    
    // Step 1: Test the archived shift reports endpoint
    console.log('\n📋 Step 1: Testing /api/reports/shifts endpoint...');
    const archivedResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: authHeaders
    });
    
    console.log(`✅ Status: ${archivedResponse.status}`);
    console.log(`📊 Total archived reports: ${archivedResponse.data.data?.length || 0}`);
    
    const archivedReports = archivedResponse.data?.data || [];
    
    // Extract shift IDs with reports (same logic as frontend)
    const shiftIdsWithReports = new Set();
    archivedReports.forEach(report => {
      // Check for shift_id in archived_data.shift_info.id (where it's actually stored)
      const shiftId = report.archived_data?.shift_info?.id || report.archived_data?.shift_id || report.shift_id;
      if (shiftId) {
        shiftIdsWithReports.add(shiftId);
      }
    });
    
    console.log(`🔑 Unique shift IDs with reports: [${Array.from(shiftIdsWithReports).join(', ')}]`);
    
    // Show details of each archived report
    console.log('\n📋 Archived Reports Details:');
    archivedReports.forEach((report, index) => {
      console.log(`  ${index + 1}. ID: ${report.id}`);
      console.log(`     Title: ${report.title}`);
      console.log(`     Shift ID: ${report.shift_id}`);
      console.log(`     Archived Data Shift ID: ${report.archived_data?.shift_id}`);
      console.log(`     Created: ${report.created_at}`);
    });
    
    // Step 2: Test all shifts endpoint
    console.log('\n🔄 Step 2: Testing /api/shifts endpoint...');
    const shiftsResponse = await axios.get('http://localhost:5000/api/shifts', {
      headers: authHeaders
    });
    
    console.log(`✅ Status: ${shiftsResponse.status}`);
    console.log(`📊 Total shifts: ${shiftsResponse.data.data?.length || 0}`);
    
    const allShifts = shiftsResponse.data?.data || [];
    
    console.log('\n📋 All Shifts Details:');
    allShifts.forEach((shift, index) => {
      console.log(`  ${index + 1}. ID: ${shift.id}`);
      console.log(`     Name: ${shift.name || shift.shift_name}`);
      console.log(`     Start: ${shift.start_time}`);
      console.log(`     End: ${shift.end_time}`);
      console.log(`     Status: ${shift.status}`);
    });
    
    // Step 3: Apply frontend filtering logic
    console.log('\n🔍 Step 3: Applying Natural Language dropdown filtering...');
    const shiftsWithReports = allShifts.filter(shift => 
      shiftIdsWithReports.has(shift.id)
    );
    
    console.log(`📊 Shifts that should appear in dropdown: ${shiftsWithReports.length}`);
    
    if (shiftsWithReports.length > 0) {
      console.log('\n✅ SHIFTS AVAILABLE IN DROPDOWN:');
      shiftsWithReports.forEach((shift, index) => {
        console.log(`  ${index + 1}. ID: ${shift.id} - ${shift.name || shift.shift_name}`);
        console.log(`     Time: ${shift.start_time} to ${shift.end_time}`);
      });
    } else {
      console.log('\n❌ NO SHIFTS AVAILABLE IN DROPDOWN!');
      console.log('\n🔍 Debugging the mismatch:');
      console.log(`   - Shift IDs with reports: [${Array.from(shiftIdsWithReports).join(', ')}]`);
      console.log(`   - Available shift IDs: [${allShifts.map(s => s.id).join(', ')}]`);
    }
    
    // Step 4: Identify the issue
    console.log('\n🎯 Step 4: Issue Analysis...');
    
    const missingShifts = Array.from(shiftIdsWithReports).filter(id => 
      !allShifts.find(shift => shift.id === id)
    );
    
    const shiftsWithoutReports = allShifts.filter(shift => 
      !shiftIdsWithReports.has(shift.id)
    );
    
    if (missingShifts.length > 0) {
      console.log(`⚠️  Archived reports reference non-existent shifts: [${missingShifts.join(', ')}]`);
    }
    
    if (shiftsWithoutReports.length > 0) {
      console.log(`ℹ️  Shifts without archived reports: [${shiftsWithoutReports.map(s => s.id).join(', ')}]`);
      console.log('   These shifts will NOT appear in the Natural Language dropdown.');
    }
    
    // Step 5: Recommendation
    console.log('\n💡 RECOMMENDATION:');
    if (shiftsWithoutReports.length > 0) {
      console.log('   To make all shifts available in the Natural Language dropdown,');
      console.log('   you need to generate archived shift reports for the missing shifts.');
      console.log(`   Missing shift IDs: [${shiftsWithoutReports.map(s => s.id).join(', ')}]`);
    } else {
      console.log('   All shifts with archived reports are properly available in the dropdown.');
    }
    
  } catch (error) {
    console.error('❌ Error testing Natural Language dropdown API:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
  }
}

testNLDropdownAPI();