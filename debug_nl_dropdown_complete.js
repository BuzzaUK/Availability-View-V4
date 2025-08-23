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

  async fetchArchivedReports() {
    try {
      console.log('\n📊 Fetching archived shift reports...');
      const response = await axios.get(`${BASE_URL}/api/reports/shifts`, {
        headers: await this.getAuthHeaders()
      });
      
      console.log('✅ Archived reports API response:', {
        success: response.data.success,
        count: response.data.count,
        total: response.data.total,
        dataLength: response.data.data?.length || 0
      });
      
      if (response.data.data && response.data.data.length > 0) {
        console.log('\n📋 Sample archived report:');
        console.log(JSON.stringify(response.data.data[0], null, 2));
        
        console.log('\n🔑 All shift IDs with archived reports:');
        const shiftIds = response.data.data.map(report => report.shift_id);
        console.log(shiftIds);
        
        return response.data.data;
      } else {
        console.log('⚠️ No archived reports found');
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch archived reports:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async fetchAllShifts() {
    try {
      console.log('\n📊 Fetching all shifts...');
      const response = await axios.get(`${BASE_URL}/api/shifts`, {
        headers: await this.getAuthHeaders()
      });
      
      console.log('✅ All shifts API response:', {
        success: response.data.success,
        count: response.data.count,
        total: response.data.total,
        dataLength: response.data.data?.length || 0
      });
      
      if (response.data.data && response.data.data.length > 0) {
        console.log('\n📋 Sample shift:');
        console.log(JSON.stringify(response.data.data[0], null, 2));
        
        console.log('\n🔑 All available shift IDs:');
        const shiftIds = response.data.data.map(shift => shift.id);
        console.log(shiftIds);
        
        return response.data.data;
      } else {
        console.log('⚠️ No shifts found');
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch shifts:', error.response?.data?.message || error.message);
      return null;
    }
  }

  analyzeDataMatching(archivedReports, allShifts) {
    console.log('\n🔍 ANALYZING DATA MATCHING...');
    console.log('=' .repeat(50));
    
    if (!archivedReports || !allShifts) {
      console.log('❌ Cannot analyze - missing data');
      return;
    }
    
    const shiftIdsWithReports = archivedReports.map(report => report.shift_id);
    const allShiftIds = allShifts.map(shift => shift.id);
    
    console.log(`📊 Archived reports: ${archivedReports.length}`);
    console.log(`📊 Total shifts: ${allShifts.length}`);
    console.log(`📊 Shift IDs with reports: ${shiftIdsWithReports.length}`);
    
    // Find matching shifts (these should appear in dropdown)
    const matchingShifts = allShifts.filter(shift => 
      shiftIdsWithReports.includes(shift.id)
    );
    
    console.log(`\n✅ MATCHING SHIFTS (should appear in dropdown): ${matchingShifts.length}`);
    matchingShifts.forEach(shift => {
      console.log(`   - Shift ${shift.id}: ${shift.shift_name || 'Unnamed'} (${shift.start_time} - ${shift.end_time})`);
    });
    
    // Find archived reports without matching shifts
    const archivedButNoShift = shiftIdsWithReports.filter(id => 
      !allShiftIds.includes(id)
    );
    
    if (archivedButNoShift.length > 0) {
      console.log(`\n⚠️ ARCHIVED REPORTS WITH NO MATCHING SHIFT: ${archivedButNoShift.length}`);
      archivedButNoShift.forEach(id => {
        const report = archivedReports.find(r => r.shift_id === id);
        console.log(`   - Shift ID ${id}: ${report?.report_name || 'Unknown'}`);
      });
    }
    
    // Find shifts without archived reports
    const shiftButNoArchive = allShifts.filter(shift => 
      !shiftIdsWithReports.includes(shift.id)
    );
    
    if (shiftButNoArchive.length > 0) {
      console.log(`\n ℹ️ SHIFTS WITHOUT ARCHIVED REPORTS: ${shiftButNoArchive.length}`);
      shiftButNoArchive.forEach(shift => {
        console.log(`   - Shift ${shift.id}: ${shift.shift_name || 'Unnamed'} (${shift.start_time} - ${shift.end_time})`);
      });
    }
    
    return {
      matchingShifts,
      archivedButNoShift,
      shiftButNoArchive
    };
  }

  async checkSpecificShift() {
    console.log('\n🔍 CHECKING SPECIFIC SHIFT FROM ARCHIVE...');
    console.log('=' .repeat(50));
    
    // Based on the archive screenshot, we're looking for "Shift Report - Shift 2 - Sun Aug 17 2025"
    // This should have shift_id that matches a shift with start_time "14:00" and end_time "22:00"
    
    try {
      const archivedReports = await this.fetchArchivedReports();
      const allShifts = await this.fetchAllShifts();
      
      if (archivedReports && allShifts) {
        // Look for the specific shift from the archive
        const targetReport = archivedReports.find(report => 
          report.report_name && report.report_name.includes('Shift 2') && 
          report.report_name.includes('Aug 17')
        );
        
        if (targetReport) {
          console.log('\n✅ Found target archived report:');
          console.log(JSON.stringify(targetReport, null, 2));
          
          const matchingShift = allShifts.find(shift => shift.id === targetReport.shift_id);
          
          if (matchingShift) {
            console.log('\n✅ Found matching shift:');
            console.log(JSON.stringify(matchingShift, null, 2));
            console.log('\n🎯 This shift SHOULD appear in the Natural Language dropdown');
          } else {
            console.log('\n❌ NO MATCHING SHIFT FOUND for shift_id:', targetReport.shift_id);
            console.log('🔍 Available shift IDs:', allShifts.map(s => s.id));
          }
        } else {
          console.log('\n❌ Could not find the target archived report');
          console.log('🔍 Available archived reports:');
          archivedReports.forEach(report => {
            console.log(`   - ${report.report_name} (shift_id: ${report.shift_id})`);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking specific shift:', error.message);
    }
  }

  async check22HourShift() {
    console.log('\n🌙 CHECKING 22:00 SHIFT SCHEDULE...');
    console.log('=' .repeat(50));
    
    try {
      const allShifts = await this.fetchAllShifts();
      
      if (allShifts) {
        // Look for shifts that start at 22:00 or end at 22:00
        const eveningShifts = allShifts.filter(shift => 
          shift.start_time === '22:00' || shift.end_time === '22:00'
        );
        
        if (eveningShifts.length > 0) {
          console.log(`✅ Found ${eveningShifts.length} shift(s) involving 22:00:`);
          eveningShifts.forEach(shift => {
            console.log(`   - Shift ${shift.id}: ${shift.shift_name || 'Unnamed'}`);
            console.log(`     Time: ${shift.start_time} - ${shift.end_time}`);
            console.log(`     Status: ${shift.status || 'Unknown'}`);
            console.log(`     Created: ${shift.created_at}`);
          });
        } else {
          console.log('❌ No shifts found involving 22:00 time');
          console.log('🔍 Available shift times:');
          allShifts.forEach(shift => {
            console.log(`   - Shift ${shift.id}: ${shift.start_time} - ${shift.end_time}`);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking 22:00 shift:', error.message);
    }
  }

  async runCompleteDebug() {
    console.log('🚀 STARTING COMPLETE NATURAL LANGUAGE DROPDOWN DEBUG');
    console.log('=' .repeat(60));
    
    // Step 1: Authenticate
    const authenticated = await this.authenticate();
    if (!authenticated) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }
    
    // Step 2: Fetch data
    const archivedReports = await this.fetchArchivedReports();
    const allShifts = await this.fetchAllShifts();
    
    // Step 3: Analyze matching
    const analysis = this.analyzeDataMatching(archivedReports, allShifts);
    
    // Step 4: Check specific shift from archive
    await this.checkSpecificShift();
    
    // Step 5: Check 22:00 shift
    await this.check22HourShift();
    
    console.log('\n🏁 DEBUG COMPLETE');
    console.log('=' .repeat(60));
    
    if (analysis && analysis.matchingShifts.length === 0) {
      console.log('🚨 CRITICAL ISSUE: No matching shifts found for dropdown!');
    } else if (analysis) {
      console.log(`✅ ${analysis.matchingShifts.length} shifts should appear in dropdown`);
    }
  }
}

// Run the debug
const nlDebugger = new NLDropdownDebugger();
nlDebugger.runCompleteDebug().catch(console.error);