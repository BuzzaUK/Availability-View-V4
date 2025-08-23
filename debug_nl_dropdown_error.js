const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'admin123'
};

class NLDropdownDebugger {
  constructor() {
    this.authToken = null;
  }

  async authenticate() {
    try {
      console.log('🔐 Authenticating...');
      const response = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS);
      this.authToken = response.data.token;
      console.log('✅ Authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  async debugDropdownError() {
    console.log('🔍 DEBUGGING NATURAL LANGUAGE DROPDOWN ERROR');
    console.log('=' .repeat(60));
    
    try {
      // Step 1: Check archived reports
      console.log('\n📋 Step 1: Fetching archived shift reports...');
      const archivedResponse = await axios.get(`${BASE_URL}/api/reports/shifts`, {
        headers: await this.getAuthHeaders()
      });
      
      const archivedReports = archivedResponse.data.data || [];
      console.log(`📊 Archived reports found: ${archivedReports.length}`);
      
      if (archivedReports.length === 0) {
        console.log('❌ NO ARCHIVED REPORTS FOUND - This is the root cause!');
        console.log('💡 The dropdown requires archived shift reports to populate');
        return;
      }
      
      // Show archived reports details
      console.log('\n📋 Archived Reports Details:');
      archivedReports.forEach((report, index) => {
        console.log(`  ${index + 1}. ID: ${report.id}, Shift ID: ${report.shift_id}, Title: ${report.title}`);
      });
      
      // Extract shift IDs
      const shiftIdsWithReports = archivedReports
        .map(report => report.shift_id)
        .filter(id => id !== null && id !== undefined);
      
      console.log(`\n🔑 Shift IDs with reports: [${shiftIdsWithReports.join(', ')}]`);
      
      if (shiftIdsWithReports.length === 0) {
        console.log('❌ NO VALID SHIFT IDs FOUND - shift_id fields are missing or null!');
        console.log('💡 This means the reportController fix may not be working');
        return;
      }
      
      // Step 2: Check all shifts
      console.log('\n🔄 Step 2: Fetching all shifts...');
      const shiftsResponse = await axios.get(`${BASE_URL}/api/shifts`, {
        headers: await this.getAuthHeaders()
      });
      
      const allShifts = shiftsResponse.data.data || [];
      console.log(`📊 Total shifts available: ${allShifts.length}`);
      
      if (allShifts.length === 0) {
        console.log('❌ NO SHIFTS FOUND IN DATABASE!');
        console.log('💡 This could be a database issue or all shifts were deleted');
        return;
      }
      
      // Show all shifts
      console.log('\n📋 All Shifts:');
      allShifts.forEach((shift, index) => {
        console.log(`  ${index + 1}. ID: ${shift.id}, Name: ${shift.shift_name}, Status: ${shift.status}`);
      });
      
      // Step 3: Apply dropdown filtering logic
      console.log('\n🔍 Step 3: Applying dropdown filtering logic...');
      const filteredShifts = allShifts.filter(shift => shiftIdsWithReports.includes(shift.id));
      
      console.log(`📊 Shifts that should appear in dropdown: ${filteredShifts.length}`);
      
      if (filteredShifts.length === 0) {
        console.log('❌ NO SHIFTS MATCH THE FILTERING CRITERIA!');
        console.log('💡 This means shift IDs in archived reports don\'t match any existing shifts');
        
        // Debug the mismatch
        console.log('\n🔍 Debugging ID mismatch:');
        console.log('Shift IDs from archived reports:', shiftIdsWithReports);
        console.log('Shift IDs from all shifts:', allShifts.map(s => s.id));
        
        // Check data types
        console.log('\nData type analysis:');
        console.log('Archived report shift_id types:', shiftIdsWithReports.map(id => `${id} (${typeof id})`));
        console.log('Shift ID types:', allShifts.slice(0, 3).map(s => `${s.id} (${typeof s.id})`));
        
        return;
      }
      
      // Step 4: Show successful matches
      console.log('\n✅ Successful matches:');
      filteredShifts.forEach((shift, index) => {
        console.log(`  ${index + 1}. ${shift.shift_name} (ID: ${shift.id})`);
      });
      
      console.log('\n🎯 CONCLUSION: The dropdown should be working with these shifts');
      console.log('💡 If you\'re still seeing the error, it might be a frontend caching issue');
      console.log('💡 Try refreshing the browser or clearing browser cache');
      
    } catch (error) {
      console.error('❌ Error during debugging:', error.response?.data?.message || error.message);
      if (error.response?.status === 401) {
        console.log('💡 Authentication issue - check if the server is running and credentials are correct');
      }
    }
  }

  async checkFrontendCacheIssue() {
    console.log('\n🌐 Step 4: Checking for potential frontend cache issues...');
    
    try {
      // Make a request with cache-busting headers
      const response = await axios.get(`${BASE_URL}/api/reports/shifts?_t=${Date.now()}`, {
        headers: {
          ...await this.getAuthHeaders(),
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('✅ Fresh API request successful');
      console.log(`📊 Fresh data shows ${response.data.data?.length || 0} archived reports`);
      
    } catch (error) {
      console.error('❌ Fresh API request failed:', error.message);
    }
  }

  async runDebug() {
    const authenticated = await this.authenticate();
    if (!authenticated) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }
    
    await this.debugDropdownError();
    await this.checkFrontendCacheIssue();
    
    console.log('\n🏁 DEBUG COMPLETE');
    console.log('=' .repeat(60));
  }
}

// Run the debug
const nlDebugger = new NLDropdownDebugger();
nlDebugger.runDebug().catch(console.error);