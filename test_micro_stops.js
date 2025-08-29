const axios = require('axios');

// Test script to generate micro stop events
async function generateMicroStopEvents() {
  console.log('🧪 Testing Micro Stop Detection...');
  
  const baseURL = 'http://localhost:5000';
  const assetId = 1; // Assuming asset ID 1 exists
  const loggerPin = 4; // Pin number for the asset (Line 2)
  
  try {
    // 1. Start with asset in RUNNING state
    console.log('\n1. Setting asset to RUNNING state...');
    await axios.post(`${baseURL}/api/asset-state`, {
      logger_id: 'ESP32_001',
      pin_number: loggerPin,
      state: 'RUNNING'
    });
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Create a micro stop (short stop < 5 minutes)
    console.log('2. Creating MICRO STOP (2 minutes)...');
    await axios.post(`${baseURL}/api/asset-state`, {
      logger_id: 'ESP32_001',
      pin_number: loggerPin,
      state: 'STOPPED'
    });
    
    // Wait 2 minutes (120 seconds) to simulate micro stop
    console.log('   Waiting 2 minutes for micro stop duration...');
    await new Promise(resolve => setTimeout(resolve, 120000));
    
    // 3. Resume running
    console.log('3. Resuming RUNNING state...');
    await axios.post(`${baseURL}/api/asset-state`, {
      logger_id: 'ESP32_001',
      pin_number: loggerPin,
      state: 'RUNNING'
    });
    
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. Create another micro stop (1 minute)
    console.log('4. Creating another MICRO STOP (1 minute)...');
    await axios.post(`${baseURL}/api/asset-state`, {
      logger_id: 'ESP32_001',
      pin_number: loggerPin,
      state: 'STOPPED'
    });
    
    // Wait 1 minute (60 seconds)
    console.log('   Waiting 1 minute for micro stop duration...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // 5. Resume running
    console.log('5. Resuming RUNNING state...');
    await axios.post(`${baseURL}/api/asset-state`, {
      logger_id: 'ESP32_001',
      pin_number: loggerPin,
      state: 'RUNNING'
    });
    
    console.log('\n✅ Micro stop test completed!');
    console.log('📊 Check the analytics page to see the micro stops recorded.');
    console.log('🔍 Look for:');
    console.log('   - Micro stops count should increase');
    console.log('   - Micro stop time should show accumulated time');
    console.log('   - Short stop chart should display the events');
    
  } catch (error) {
    console.error('❌ Error during micro stop test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
generateMicroStopEvents();