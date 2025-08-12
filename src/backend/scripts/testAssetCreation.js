const axios = require('axios');

async function testAssetCreation() {
  try {
    console.log('🔍 Testing asset creation...');
    
    const assetData = {
      name: 'Test Asset',
      description: '',
      type: 'machine',
      pin_number: '4',
      logger_id: 'ESP32_001',
      short_stop_threshold: 5,
      long_stop_threshold: 30,
      downtime_reasons: 'Maintenance,Breakdown,Setup,Material shortage,Quality issue',
      thresholds: {
        availability: 85,
        performance: 85,
        quality: 95,
        oee: 75
      },
      settings: {
        idleTimeThreshold: 5,
        warningTimeThreshold: 10,
        collectQualityData: true,
        collectPerformanceData: true
      }
    };
    
    console.log('🔍 Sending asset data:', JSON.stringify(assetData, null, 2));
    
    const response = await axios.post('http://localhost:5000/api/assets', assetData);
    
    console.log('✅ Asset created successfully!');
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error creating asset:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    if (error.response?.data?.error) {
      console.error('Detailed error:', error.response.data.error);
    }
  }
}

testAssetCreation();