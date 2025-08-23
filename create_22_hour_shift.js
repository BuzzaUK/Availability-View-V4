const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'admin123'
};

class ShiftWorkflowTester {
  constructor() {
    this.authToken = null;
    this.createdShiftId = null;
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

  async start22HourShift() {
    try {
      console.log('\n🌙 Starting 22:00 shift...');
      
      const today = new Date();
      const shiftName = `Night Shift - ${today.toLocaleDateString()} 22:00`;
      const notes = 'Test night shift for 22:00 workflow validation';
      
      console.log('📊 Shift details:', {
        name: shiftName,
        notes: notes,
        startTime: new Date().toLocaleString()
      });
      
      const response = await axios.post(`${BASE_URL}/api/shifts/start`, {
        name: shiftName,
        notes: notes
      }, {
        headers: await this.getAuthHeaders()
      });
      
      if (response.data.success) {
        this.createdShiftId = response.data.data.id;
        console.log('✅ 22:00 shift started successfully');
        console.log(`🆔 Shift ID: ${this.createdShiftId}`);
        console.log(`📋 Shift Name: ${response.data.data.shift_name}`);
        return response.data.data;
      } else {
        throw new Error('Failed to start shift: ' + response.data.message);
      }
    } catch (error) {
      console.error('❌ Failed to start 22:00 shift:', error.response?.data?.message || error.message);
      return null;
    }
  }

  // This method is no longer needed since we start the shift directly
  // async startShift(shiftId) { ... }

  async generateSomeEvents(shiftId) {
    try {
      console.log(`\n📊 Generating some test events for shift ${shiftId}...`);
      
      // Get available assets
      const assetsResponse = await axios.get(`${BASE_URL}/api/assets`, {
        headers: await this.getAuthHeaders()
      });
      
      const assets = assetsResponse.data.data || assetsResponse.data || [];
      if (assets.length === 0) {
        console.log('⚠️ No assets found, skipping event generation');
        return;
      }
      
      const asset = assets[0]; // Use first available asset
      console.log(`📋 Using asset: ${asset.name} (ID: ${asset.id})`);
      
      // Generate a few test events
      const events = [
        { asset_id: asset.id, event_type: 'START', new_state: 'RUNNING' },
        { asset_id: asset.id, event_type: 'STOP', new_state: 'STOPPED', stop_reason: 'Maintenance' },
        { asset_id: asset.id, event_type: 'START', new_state: 'RUNNING' }
      ];
      
      for (let i = 0; i < events.length; i++) {
        const eventData = {
          ...events[i],
          shift_id: shiftId,
          timestamp: new Date().toISOString(),
          notes: `Test event ${i + 1} for 22:00 shift validation`
        };
        
        try {
          await axios.post(`${BASE_URL}/api/events`, eventData, {
            headers: await this.getAuthHeaders()
          });
          console.log(`   ✅ Event ${i + 1}: ${eventData.event_type} - ${eventData.new_state}`);
          
          // Small delay between events
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (eventError) {
          console.log(`   ⚠️ Event ${i + 1} failed:`, eventError.response?.data?.message || eventError.message);
        }
      }
      
      console.log('✅ Test events generated');
    } catch (error) {
      console.error('❌ Failed to generate events:', error.response?.data?.message || error.message);
    }
  }

  async endShift() {
    try {
      console.log(`\n⏹️ Ending current shift...`);
      
      const response = await axios.post(`${BASE_URL}/api/shifts/end`, {
        notes: 'Test shift completed for 22:00 workflow validation'
      }, {
        headers: await this.getAuthHeaders()
      });
      
      if (response.data.success) {
        console.log('✅ Shift ended successfully');
        return true;
      } else {
        throw new Error('Failed to end shift: ' + response.data.message);
      }
    } catch (error) {
      console.error('❌ Failed to end shift:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async waitForArchiving(shiftId, maxWaitTime = 30000) {
    console.log(`\n⏳ Waiting for shift ${shiftId} to be archived (max ${maxWaitTime/1000}s)...`);
    
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check if archived report exists
        const response = await axios.get(`${BASE_URL}/api/reports/shifts`, {
          headers: await this.getAuthHeaders()
        });
        
        const archivedReports = response.data.data || [];
        const shiftReport = archivedReports.find(report => report.shift_id === shiftId);
        
        if (shiftReport) {
          console.log('✅ Shift archived successfully!');
          console.log(`📋 Archive ID: ${shiftReport.id}`);
          console.log(`📋 Report title: ${shiftReport.title}`);
          return shiftReport;
        }
        
        console.log(`   ⏳ Still waiting... (${Math.round((Date.now() - startTime)/1000)}s)`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.log(`   ⚠️ Error checking archives: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    console.log('❌ Timeout waiting for archiving');
    return null;
  }

  async testNLDropdownAvailability(shiftId) {
    try {
      console.log(`\n🔍 Testing Natural Language dropdown availability for shift ${shiftId}...`);
      
      // Get archived reports
      const archivedResponse = await axios.get(`${BASE_URL}/api/reports/shifts`, {
        headers: await this.getAuthHeaders()
      });
      
      const archivedReports = archivedResponse.data.data || [];
      const shiftIdsWithReports = archivedReports.map(report => report.shift_id).filter(id => id);
      
      console.log(`📊 Archived reports found: ${archivedReports.length}`);
      console.log(`🔑 Shift IDs with reports: [${shiftIdsWithReports.join(', ')}]`);
      
      // Get all shifts
      const shiftsResponse = await axios.get(`${BASE_URL}/api/shifts`, {
        headers: await this.getAuthHeaders()
      });
      
      const allShifts = shiftsResponse.data.data || [];
      console.log(`📊 Total shifts available: ${allShifts.length}`);
      
      // Filter shifts that should appear in dropdown
      const filteredShifts = allShifts.filter(shift => shiftIdsWithReports.includes(shift.id));
      
      console.log(`📊 Shifts that should appear in NL dropdown: ${filteredShifts.length}`);
      
      // Check if our test shift is included
      const ourShiftInDropdown = filteredShifts.find(shift => shift.id === shiftId);
      
      if (ourShiftInDropdown) {
        console.log('✅ SUCCESS: 22:00 shift is available in Natural Language dropdown!');
        console.log(`📋 Shift details: ${ourShiftInDropdown.shift_name}`);
        return true;
      } else {
        console.log('❌ FAILURE: 22:00 shift is NOT available in Natural Language dropdown');
        
        // Debug information
        const ourShift = allShifts.find(shift => shift.id === shiftId);
        if (ourShift) {
          console.log(`🔍 Our shift exists: ${ourShift.shift_name} (ID: ${ourShift.id})`);
        } else {
          console.log('🔍 Our shift not found in all shifts');
        }
        
        const ourReport = archivedReports.find(report => report.shift_id === shiftId);
        if (ourReport) {
          console.log(`🔍 Our report exists: ${ourReport.title} (shift_id: ${ourReport.shift_id})`);
        } else {
          console.log('🔍 Our report not found in archived reports');
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to test NL dropdown availability:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async runCompleteWorkflow() {
    console.log('🚀 STARTING COMPLETE 22:00 SHIFT WORKFLOW TEST');
    console.log('=' .repeat(60));
    
    // Step 1: Authenticate
    const authenticated = await this.authenticate();
    if (!authenticated) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }
    
    // Step 2: Start 22:00 shift (creates and starts in one step)
    const shift = await this.start22HourShift();
    if (!shift) {
      console.log('❌ Cannot proceed without starting shift');
      return;
    }
    
    // Step 3: Generate some test events
    await this.generateSomeEvents(this.createdShiftId);
    
    // Step 4: End the shift
    const ended = await this.endShift();
    if (!ended) {
      console.log('❌ Cannot proceed without ending shift');
      return;
    }
    
    // Step 5: Wait for archiving
    const archivedReport = await this.waitForArchiving(this.createdShiftId);
    if (!archivedReport) {
      console.log('❌ Archiving failed or timed out');
      return;
    }
    
    // Step 6: Test Natural Language dropdown availability
    const available = await this.testNLDropdownAvailability(this.createdShiftId);
    
    console.log('\n🏁 WORKFLOW TEST COMPLETE');
    console.log('=' .repeat(60));
    
    if (available) {
      console.log('🎉 SUCCESS: Complete workflow validated!');
      console.log('✅ 22:00 shift can be created, processed, archived, and appears in Natural Language dropdown');
    } else {
      console.log('❌ FAILURE: Workflow has issues');
      console.log('🔍 The shift was created and archived but may not appear correctly in the dropdown');
    }
    
    return {
      shiftId: this.createdShiftId,
      archived: !!archivedReport,
      availableInDropdown: available
    };
  }
}

// Run the workflow test
const tester = new ShiftWorkflowTester();
tester.runCompleteWorkflow().catch(console.error);