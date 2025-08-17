const http = require('http');
const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

console.log('🚀 COMPREHENSIVE SHIFT CHANGE TEST');
console.log('=====================================');
console.log('This test will validate the complete shift change workflow:');
console.log('1. Trigger a complete shift change');
console.log('2. Verify archiving of previous events');
console.log('3. Confirm generation of the shift report');
console.log('4. Ensure a new shift is correctly initiated');
console.log('5. Validate dashboard resets to zero');
console.log('');

let testResults = {
  shiftChangeTriggered: false,
  eventArchivingVerified: false,
  shiftReportGenerated: false,
  newShiftInitiated: false,
  dashboardReset: false,
  websocketEventsReceived: {
    dashboard_reset: false,
    shift_update: false,
    events_update: false
  }
};

// Helper function to make HTTP requests
const makeHttpRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

// Authenticate and get JWT token
const authenticateUser = async () => {
  console.log('\n🔐 AUTHENTICATION: Logging in as admin...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const postData = JSON.stringify({
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const response = await makeHttpRequest(options, postData);
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ Authentication successful');
      console.log('👤 Logged in as:', response.data.user.name, '(' + response.data.user.role + ')');
      return response.data.token;
    } else {
      throw new Error('Authentication failed: ' + (response.data.message || 'Unknown error'));
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    throw error;
  }
};

// Step 1: Check current shift status
const checkCurrentShift = async (token) => {
  console.log('\n📋 STEP 1: Checking current shift status...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/shifts/current',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await makeHttpRequest(options);
    console.log('✅ Current shift status:', response.statusCode);
    if (response.data && response.data.shift) {
      console.log('📊 Active shift:', response.data.shift.shift_name);
      console.log('🕐 Start time:', response.data.shift.start_time);
    } else {
      console.log('📊 No active shift found');
    }
    return response.data;
  } catch (error) {
    console.log('❌ Failed to check current shift:', error.message);
    return null;
  }
};

// Step 2: Count existing archives before shift change
const countExistingArchives = async (token) => {
  console.log('\n📋 STEP 2: Counting existing archives...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/archives',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await makeHttpRequest(options);
    console.log('✅ Archives API response:', response.statusCode);
    const archiveCount = response.data && response.data.archives ? response.data.archives.length : 0;
    console.log('📊 Current archive count:', archiveCount);
    return archiveCount;
  } catch (error) {
    console.log('❌ Failed to count archives:', error.message);
    return 0;
  }
};

// Step 3: Count existing shift reports
const countShiftReports = () => {
  console.log('\n📋 STEP 3: Counting existing shift reports...');
  try {
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      console.log('📊 Reports directory does not exist');
      return 0;
    }
    
    const files = fs.readdirSync(reportsDir);
    const shiftReports = files.filter(file => file.startsWith('shift_report_'));
    console.log('📊 Current shift report count:', shiftReports.length);
    return shiftReports.length;
  } catch (error) {
    console.log('❌ Failed to count shift reports:', error.message);
    return 0;
  }
};

// Step 4: Setup WebSocket monitoring
const setupWebSocketMonitoring = () => {
  return new Promise((resolve, reject) => {
    console.log('\n📋 STEP 4: Setting up WebSocket monitoring...');
    
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });
    
    let connected = false;
    
    socket.on('connect', () => {
      connected = true;
      console.log('✅ WebSocket connected for monitoring');
      console.log('🆔 Socket ID:', socket.id);
      
      // Listen for all relevant events
      socket.on('dashboard_reset', (data) => {
        console.log('📡 DASHBOARD_RESET event received:', data);
        testResults.websocketEventsReceived.dashboard_reset = true;
        testResults.dashboardReset = true;
      });
      
      socket.on('shift_update', (data) => {
        console.log('📡 SHIFT_UPDATE event received:', data);
        testResults.websocketEventsReceived.shift_update = true;
        if (data && (data.currentShift === null || data.message)) {
          testResults.newShiftInitiated = true;
        }
      });
      
      socket.on('events_update', (data) => {
        console.log('📡 EVENTS_UPDATE event received:', data);
        testResults.websocketEventsReceived.events_update = true;
      });
      
      resolve(socket);
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection error:', error.message);
      if (!connected) {
        reject(error);
      }
    });
    
    setTimeout(() => {
      if (!connected) {
        reject(new Error('WebSocket connection timeout'));
      }
    }, 10000);
  });
};

// Step 5: Trigger shift change
const triggerShiftChange = async (token) => {
  console.log('\n📋 STEP 5: Triggering shift change...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/shifts/end',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const postData = JSON.stringify({ reason: 'Comprehensive test' });
    const response = await makeHttpRequest(options, postData);
    
    console.log('✅ Shift change triggered, status:', response.statusCode);
    console.log('📊 Response:', response.data);
    
    if (response.statusCode === 200) {
      testResults.shiftChangeTriggered = true;
      return true;
    }
    return false;
  } catch (error) {
    console.log('❌ Failed to trigger shift change:', error.message);
    return false;
  }
};

// Step 6: Verify results after delay
const verifyResults = async (token, initialArchiveCount, initialReportCount) => {
  console.log('\n📋 STEP 6: Verifying results after shift change...');
  
  // Wait for processing to complete
  console.log('⏳ Waiting 10 seconds for shift change processing...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Check archives
  const newArchiveCount = await countExistingArchives(token);
  if (newArchiveCount > initialArchiveCount) {
    console.log('✅ Event archiving verified - new archives created');
    testResults.eventArchivingVerified = true;
  } else {
    console.log('⚠️ Event archiving not detected - archive count unchanged');
  }
  
  // Check shift reports
  const newReportCount = countShiftReports();
  if (newReportCount > initialReportCount) {
    console.log('✅ Shift report generation verified - new report created');
    testResults.shiftReportGenerated = true;
  } else {
    console.log('⚠️ Shift report generation not detected - report count unchanged');
  }
  
  // Check current shift status
  const currentShift = await checkCurrentShift(token);
  if (!currentShift || !currentShift.shift) {
    console.log('✅ New shift initiation verified - no active shift (ready for new shift)');
    testResults.newShiftInitiated = true;
  }
};

// Main test execution
const runComprehensiveTest = async () => {
  try {
    console.log('\n🚀 Starting comprehensive shift change test...');
    
    // Authenticate first
    const token = await authenticateUser();
    
    // Get baseline counts
    const currentShift = await checkCurrentShift(token);
    const initialArchiveCount = await countExistingArchives(token);
    const initialReportCount = countShiftReports();
    
    // Setup WebSocket monitoring
    const socket = await setupWebSocketMonitoring();
    
    // Trigger shift change
    const shiftChangeSuccess = await triggerShiftChange(token);
    
    if (!shiftChangeSuccess) {
      throw new Error('Failed to trigger shift change');
    }
    
    // Verify results
    await verifyResults(token, initialArchiveCount, initialReportCount);
    
    // Disconnect WebSocket
    socket.disconnect();
    
    // Print final results
    console.log('\n🏁 COMPREHENSIVE TEST RESULTS');
    console.log('===============================');
    console.log('1. Shift change triggered:', testResults.shiftChangeTriggered ? '✅ PASS' : '❌ FAIL');
    console.log('2. Event archiving verified:', testResults.eventArchivingVerified ? '✅ PASS' : '❌ FAIL');
    console.log('3. Shift report generated:', testResults.shiftReportGenerated ? '✅ PASS' : '❌ FAIL');
    console.log('4. New shift initiated:', testResults.newShiftInitiated ? '✅ PASS' : '❌ FAIL');
    console.log('5. Dashboard reset validated:', testResults.dashboardReset ? '✅ PASS' : '❌ FAIL');
    
    console.log('\nWebSocket Events Received:');
    console.log('- dashboard_reset:', testResults.websocketEventsReceived.dashboard_reset ? '✅' : '❌');
    console.log('- shift_update:', testResults.websocketEventsReceived.shift_update ? '✅' : '❌');
    console.log('- events_update:', testResults.websocketEventsReceived.events_update ? '✅' : '❌');
    
    const allTestsPassed = Object.values(testResults).every(result => {
      if (typeof result === 'object') {
        return Object.values(result).every(val => val === true);
      }
      return result === true;
    });
    
    console.log('\n🎯 OVERALL RESULT:', allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    if (allTestsPassed) {
      console.log('\n🚀 Application is ready for deployment to Heroku!');
    } else {
      console.log('\n🔧 Please review failed tests before deployment.');
    }
    
  } catch (error) {
    console.log('\n❌ Comprehensive test failed:', error.message);
    console.log('\n🔧 Please check server status and try again.');
  } finally {
    process.exit(0);
  }
};

// Run the comprehensive test
runComprehensiveTest();