// Browser console script to debug Natural Language Reports dropdown
// Run this in the browser console while on the Natural Language Reports page

console.log('🔍 Starting Natural Language Dropdown Debug...');

// Function to test API endpoints directly in browser
async function debugNLDropdown() {
  try {
    console.log('\n1. Testing archived shift reports API...');
    
    // Get archived shift reports
    const archivedResponse = await fetch('/api/reports/shifts', {
      headers: {
        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
        'Content-Type': 'application/json'
      }
    });
    
    if (!archivedResponse.ok) {
      console.error('❌ Archived reports API failed:', archivedResponse.status, archivedResponse.statusText);
      return;
    }
    
    const archivedData = await archivedResponse.json();
    console.log('✅ Archived reports response:', archivedData);
    console.log('📊 Archived reports count:', archivedData.data?.length || 0);
    
    if (archivedData.data && archivedData.data.length > 0) {
      console.log('📋 First archived report:', archivedData.data[0]);
      console.log('🔑 Shift IDs with reports:', archivedData.data.map(report => report.shift_id));
    }
    
    console.log('\n2. Testing all shifts API...');
    
    // Get all shifts
    const shiftsResponse = await fetch('/api/shifts', {
      headers: {
        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
        'Content-Type': 'application/json'
      }
    });
    
    if (!shiftsResponse.ok) {
      console.error('❌ Shifts API failed:', shiftsResponse.status, shiftsResponse.statusText);
      return;
    }
    
    const shiftsData = await shiftsResponse.json();
    console.log('✅ All shifts response:', shiftsData);
    console.log('📊 Total shifts count:', shiftsData.data?.length || 0);
    
    if (shiftsData.data && shiftsData.data.length > 0) {
      console.log('📋 First shift:', shiftsData.data[0]);
      console.log('🔑 All shift IDs:', shiftsData.data.map(shift => shift.id));
    }
    
    console.log('\n3. Analyzing data matching...');
    
    if (archivedData.data && shiftsData.data) {
      const shiftIdsWithReports = archivedData.data.map(report => report.shift_id);
      const allShiftIds = shiftsData.data.map(shift => shift.id);
      
      console.log('🔍 Shift IDs with archived reports:', shiftIdsWithReports);
      console.log('🔍 All available shift IDs:', allShiftIds);
      
      // Find matches
      const matchingShifts = shiftsData.data.filter(shift => 
        shiftIdsWithReports.includes(shift.id)
      );
      
      console.log('✅ Matching shifts (should appear in dropdown):', matchingShifts);
      console.log('📊 Matching shifts count:', matchingShifts.length);
      
      // Find mismatches
      const archivedButNoShift = shiftIdsWithReports.filter(id => 
        !allShiftIds.includes(id)
      );
      
      const shiftButNoArchive = allShiftIds.filter(id => 
        !shiftIdsWithReports.includes(id)
      );
      
      if (archivedButNoShift.length > 0) {
        console.warn('⚠️ Archived reports with no matching shift:', archivedButNoShift);
      }
      
      if (shiftButNoArchive.length > 0) {
        console.log('ℹ️ Shifts with no archived reports:', shiftButNoArchive);
      }
    }
    
    console.log('\n4. Checking current dropdown state...');
    
    // Try to find the dropdown element
    const dropdown = document.querySelector('select[name="shift_id"], select[id*="shift"], .shift-dropdown select');
    if (dropdown) {
      console.log('✅ Found dropdown element:', dropdown);
      console.log('📋 Dropdown options:', Array.from(dropdown.options).map(opt => ({
        value: opt.value,
        text: opt.text
      })));
    } else {
      console.log('❌ Could not find dropdown element');
      console.log('🔍 Available select elements:', document.querySelectorAll('select'));
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug function
debugNLDropdown();

console.log('\n💡 To re-run this debug, call: debugNLDropdown()');