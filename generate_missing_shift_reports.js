const axios = require('axios');

async function generateMissingShiftReports() {
  try {
    console.log('🔧 Generating Missing Shift Reports for Natural Language Dropdown');
    console.log('=' .repeat(70));
    
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
    
    // Get current state
    console.log('\n📊 Getting current state...');
    const archivedResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: authHeaders
    });
    const shiftsResponse = await axios.get('http://localhost:5000/api/shifts', {
      headers: authHeaders
    });
    
    const archivedReports = archivedResponse.data?.data || [];
    const allShifts = shiftsResponse.data?.data || [];
    
    // Extract shift IDs that already have reports
    const shiftIdsWithReports = new Set();
    archivedReports.forEach(report => {
      // Check for shift_id in archived_data.shift_info.id (where it's actually stored)
      const shiftId = report.archived_data?.shift_info?.id || report.archived_data?.shift_id || report.shift_id;
      if (shiftId) {
        shiftIdsWithReports.add(shiftId);
      }
    });
    
    // Find shifts without reports
    const shiftsWithoutReports = allShifts.filter(shift => 
      !shiftIdsWithReports.has(shift.id)
    );
    
    console.log(`📋 Total shifts: ${allShifts.length}`);
    console.log(`📋 Shifts with reports: ${shiftIdsWithReports.size}`);
    console.log(`📋 Shifts without reports: ${shiftsWithoutReports.length}`);
    
    if (shiftsWithoutReports.length === 0) {
      console.log('\n✅ All shifts already have archived reports!');
      return;
    }
    
    console.log('\n🔧 Generating reports for shifts without archives...');
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const shift of shiftsWithoutReports) {
      try {
        console.log(`\n📊 Generating report for Shift ${shift.id}: ${shift.name}`);
        
        // Generate and archive the shift report
        const reportResponse = await axios.post(
          `http://localhost:5000/api/reports/shift/${shift.id}/archive`,
          {},
          { headers: authHeaders }
        );
        
        if (reportResponse.data.success) {
          console.log(`   ✅ Successfully generated report for Shift ${shift.id}`);
          successCount++;
        } else {
          console.log(`   ❌ Failed to generate report for Shift ${shift.id}: ${reportResponse.data.message}`);
          failureCount++;
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`   ❌ Error generating report for Shift ${shift.id}: ${error.message}`);
        failureCount++;
      }
    }
    
    console.log('\n📊 GENERATION SUMMARY:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📋 Total processed: ${successCount + failureCount}`);
    
    if (successCount > 0) {
      console.log('\n🔄 Verifying Natural Language dropdown after generation...');
      
      // Re-fetch data to verify
      const newArchivedResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
        headers: authHeaders
      });
      
      const newArchivedReports = newArchivedResponse.data?.data || [];
      const newShiftIdsWithReports = new Set();
      
      newArchivedReports.forEach(report => {
        const shiftId = report.archived_data?.shift_id || report.shift_id;
        if (shiftId) {
          newShiftIdsWithReports.add(shiftId);
        }
      });
      
      const newShiftsWithReports = allShifts.filter(shift => 
        newShiftIdsWithReports.has(shift.id)
      );
      
      console.log(`\n✅ VERIFICATION RESULTS:`);
      console.log(`   📋 Total archived reports: ${newArchivedReports.length}`);
      console.log(`   📋 Shifts available in dropdown: ${newShiftsWithReports.length}`);
      
      if (newShiftsWithReports.length > 2) {
        console.log('\n🎉 SUCCESS! More shifts are now available in the Natural Language dropdown!');
        console.log('\n📋 Available shifts:');
        newShiftsWithReports.forEach((shift, index) => {
          console.log(`   ${index + 1}. ID: ${shift.id} - ${shift.name}`);
        });
      } else {
        console.log('\n⚠️  Still only 2 shifts available. There may be additional issues.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error generating missing shift reports:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
  }
}

generateMissingShiftReports();