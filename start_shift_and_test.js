const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5000';

// Authentication function
async function authenticateUser() {
  try {
    console.log('🔐 AUTHENTICATION: Logging in as admin...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (response.data.success && response.data.token) {
      console.log('✅ Authentication successful');
      console.log(`👤 Logged in as: ${response.data.user.name} (${response.data.user.email.split('@')[0]})`);
      return response.data.token;
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

// Start a new shift
async function startNewShift(token) {
  try {
    console.log('\n📋 STEP 1: Starting a new shift...');
    const response = await axios.post(`${BASE_URL}/api/shifts/start`, {
      shiftName: 'Test Shift for Archiving',
      notes: 'Testing shift archiving and report generation'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ New shift started, status: ${response.status}`);
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    return response.data.shift;
  } catch (error) {
    console.error('❌ Failed to start shift:', error.response?.data || error.message);
    throw error;
  }
}

// Wait for a short period to simulate shift activity
async function simulateShiftActivity() {
  console.log('\n⏳ STEP 2: Simulating shift activity (waiting 10 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  console.log('✅ Shift activity simulation completed');
}

// Count existing archives
async function countExistingArchives(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/events/archives`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`✅ Event Archives API response: ${response.status}`);
    const archives = Array.isArray(response.data?.data) ? response.data.data : [];
    console.log(`📊 Current event archive count: ${archives.length}`);
    return archives.length;
  } catch (error) {
    console.error('❌ Failed to count event archives:', error.response?.data || error.message);
    return 0;
  }
}

// Count existing shift reports
async function countShiftReports(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/reports/shifts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        // Ensure we fetch enough items so count reflects actual total on first page
        limit: 1000,
        page: 1
      }
    });
    
    const total = typeof response.data?.total === 'number' ? response.data.total : 0;
    const reports = Array.isArray(response.data?.data) ? response.data.data : [];
    console.log(`📊 Current shift report total (API): ${total}`);
    console.log(`📊 Current shift report page size (data.length): ${reports.length}`);
    return total || reports.length;
  } catch (error) {
    console.error('❌ Failed to count shift reports:', error.response?.data || error.message);
    return 0;
  }
}

// End the shift and monitor results
async function endShiftAndMonitor(token, initialArchiveCount, initialReportCount) {
  return new Promise((resolve, reject) => {
    console.log('\n📋 STEP 3: Setting up WebSocket monitoring...');
    
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      timeout: 10000
    });
    
    const receivedEvents = [];
    let shiftEndResponse = null;
    
    socket.on('connect', async () => {
      console.log('✅ WebSocket connected for monitoring');
      console.log(`🆔 Socket ID: ${socket.id}`);
      
      // Set up event listeners
      socket.on('SHIFT_UPDATE', (data) => {
        console.log('📡 Received SHIFT_UPDATE:', data);
        receivedEvents.push({ type: 'SHIFT_UPDATE', data });
      });
      
      // Also listen to lowercase event names emitted by backend
      socket.on('shift_update', (data) => {
        console.log('📡 Received shift_update:', data);
        receivedEvents.push({ type: 'shift_update', data });
      });
      
      socket.on('DASHBOARD_RESET', (data) => {
        console.log('📡 Received DASHBOARD_RESET:', data);
        receivedEvents.push({ type: 'DASHBOARD_RESET', data });
      });
      
      socket.on('dashboard_reset', (data) => {
        console.log('📡 Received dashboard_reset:', data);
        receivedEvents.push({ type: 'dashboard_reset', data });
      });
      
      socket.on('EVENTS_UPDATE', (data) => {
        console.log('📡 Received EVENTS_UPDATE:', data);
        receivedEvents.push({ type: 'EVENTS_UPDATE', data });
      });
      
      socket.on('events_update', (data) => {
        console.log('📡 Received events_update:', data);
        receivedEvents.push({ type: 'events_update', data });
      });
      
      socket.on('archive_created', (data) => {
        console.log('📡 Received archive_created:', data);
        receivedEvents.push({ type: 'archive_created', data });
      });
      
      socket.on('report_generated', (data) => {
        console.log('📡 Received report_generated:', data);
        receivedEvents.push({ type: 'report_generated', data });
      });
      
      // Trigger shift end
      console.log('\n📋 STEP 4: Triggering shift end...');
      try {
        const response = await axios.post(`${BASE_URL}/api/shifts/end`, {
          notes: 'Test shift ended for archiving validation'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ Shift end triggered, status: ${response.status}`);
        console.log('📊 Response:', JSON.stringify(response.data, null, 2));
        shiftEndResponse = response.data;
        
        // Wait for events to be processed
        setTimeout(async () => {
          console.log('\n📋 STEP 5: Verifying results after processing...');
          
          // Check archive count
          const newArchiveCount = await countExistingArchives(token);
          const archiveIncreased = newArchiveCount > initialArchiveCount;
          
          // Check report count
          const newReportCount = await countShiftReports(token);
          const reportIncreased = newReportCount > initialReportCount;
          
          console.log('\n📊 RESULTS SUMMARY:');
          console.log('==================');
          console.log(`📦 Archives: ${initialArchiveCount} → ${newArchiveCount} (${archiveIncreased ? '✅ INCREASED' : '❌ NO CHANGE'})`);
          console.log(`📄 Reports: ${initialReportCount} → ${newReportCount} (${reportIncreased ? '✅ INCREASED' : '❌ NO CHANGE'})`);
          console.log(`📡 WebSocket Events Received: ${receivedEvents.length}`);
          
          receivedEvents.forEach((event, index) => {
            console.log(`   ${index + 1}. ${event.type}`);
          });
          
          const success = archiveIncreased && reportIncreased && receivedEvents.length > 0;
          
          socket.disconnect();
          
          resolve({
            success,
            archiveIncreased,
            reportIncreased,
            eventsReceived: receivedEvents.length,
            shiftEndResponse,
            receivedEvents
          });
        }, 15000); // Wait 15 seconds for processing
        
      } catch (error) {
        console.error('❌ Failed to trigger shift end:', error.response?.data || error.message);
        socket.disconnect();
        reject(error);
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection failed:', error.message);
      reject(error);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });
  });
}

// Main test function
async function runCompleteShiftTest() {
  try {
    console.log('🚀 COMPLETE SHIFT ARCHIVING TEST');
    console.log('=====================================');
    console.log('This test will:');
    console.log('1. Start a new shift');
    console.log('2. Simulate some activity');
    console.log('3. End the shift and monitor archiving');
    console.log('4. Verify event archiving and report generation');
    console.log('');
    
    // Authenticate
    const token = await authenticateUser();
    
    // Count initial archives and reports
    const initialArchiveCount = await countExistingArchives(token);
    const initialReportCount = await countShiftReports(token);
    
    // Start new shift
    const shift = await startNewShift(token);
    
    // Simulate activity
    await simulateShiftActivity();
    
    // End shift and monitor
    const results = await endShiftAndMonitor(token, initialArchiveCount, initialReportCount);
    
    if (results.success) {
      console.log('\n🎉 COMPLETE SHIFT TEST PASSED!');
      console.log('✅ Event archiving is working');
      console.log('✅ Shift report generation is working');
      console.log('✅ WebSocket events are being received');
    } else {
      console.log('\n❌ COMPLETE SHIFT TEST FAILED!');
      if (!results.archiveIncreased) {
        console.log('❌ Event archiving is not working');
      }
      if (!results.reportIncreased) {
        console.log('❌ Shift report generation is not working');
      }
      if (results.eventsReceived === 0) {
        console.log('❌ No WebSocket events received');
      }
    }
    
  } catch (error) {
    console.error('❌ Complete shift test failed:', error.message);
    console.error('🔧 Please check server status and try again.');
  }
}

runCompleteShiftTest().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});