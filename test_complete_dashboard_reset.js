const axios = require('axios');
const WebSocket = require('ws');

// Configuration
const BASE_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000';
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'admin123'
};

class CompleteDashboardResetTest {
  constructor() {
    this.authToken = null;
    this.ws = null;
    this.wsEvents = [];
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

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to WebSocket...');
        this.ws = new WebSocket(WS_URL);
        
        this.ws.on('open', () => {
          console.log('✅ WebSocket connected');
          resolve();
        });
        
        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.wsEvents.push({
              type: message.type || 'unknown',
              timestamp: new Date().toISOString(),
              data: message
            });
            console.log(`📡 WebSocket Event: ${message.type || 'unknown'}`);
          } catch (e) {
            console.log('📡 WebSocket Raw Message:', data.toString());
          }
        });
        
        this.ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error.message);
          reject(error);
        });
        
        setTimeout(() => {
          if (this.ws.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  async fetchDashboardData() {
    try {
      const response = await axios.get(`${BASE_URL}/api/assets`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      let assets;
      if (Array.isArray(response.data)) {
        assets = response.data;
      } else if (response.data.assets && Array.isArray(response.data.assets)) {
        assets = response.data.assets;
      } else {
        throw new Error('Invalid assets data format');
      }

      // Calculate totals
      const totals = assets.reduce((acc, asset) => {
        acc.totalRuntime += asset.runtime || 0;
        acc.totalDowntime += asset.downtime || 0;
        acc.totalStops += asset.total_stops || 0;
        return acc;
      }, { totalRuntime: 0, totalDowntime: 0, totalStops: 0 });

      return {
        assets,
        totals,
        systemAvailability: totals.totalRuntime + totals.totalDowntime > 0 
          ? ((totals.totalRuntime / (totals.totalRuntime + totals.totalDowntime)) * 100).toFixed(1)
          : '0.0'
      };
    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error.message);
      throw error;
    }
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  displayDashboardData(data, title) {
    console.log(`\n${title}`);
    console.log('='.repeat(50));
    console.log(`System Availability: ${data.systemAvailability}%`);
    console.log(`Total Runtime: ${this.formatTime(data.totals.totalRuntime)}`);
    console.log(`Total Downtime: ${this.formatTime(data.totals.totalDowntime)}`);
    console.log(`Total Stops: ${data.totals.totalStops}`);
    
    console.log('\nAsset Details:');
    data.assets.forEach(asset => {
      console.log(`  ${asset.asset_name}: Runtime=${this.formatTime(asset.runtime || 0)}, Downtime=${this.formatTime(asset.downtime || 0)}, Stops=${asset.total_stops || 0}`);
    });
  }

  async triggerManualReset() {
    try {
      console.log('\n🔄 Triggering manual dashboard reset...');
      
      // Clear WebSocket events array
      this.wsEvents = [];
      
      const response = await axios.post(`${BASE_URL}/api/shifts/manual-reset`, {}, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      console.log('✅ Manual reset triggered:', response.data.message);
      
      // Wait for WebSocket events
      console.log('⏳ Waiting for WebSocket events...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('\n📡 WebSocket Events Received:');
      this.wsEvents.forEach(event => {
        console.log(`  - ${event.type}: ${JSON.stringify(event.data)}`);
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to trigger manual reset:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async triggerDirectReset() {
    try {
      console.log('\n🔄 Triggering direct dashboard reset via API...');
      
      const response = await axios.post(`${BASE_URL}/api/test/dashboard-reset`, {}, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      console.log('✅ Direct reset triggered:', response.data.message);
      return true;
    } catch (error) {
      console.error('❌ Failed to trigger direct reset:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async runCompleteTest() {
    try {
      console.log('🚀 Starting Complete Dashboard Reset Test');
      console.log('=' .repeat(60));
      
      // Step 1: Authenticate
      if (!await this.authenticate()) {
        throw new Error('Authentication failed');
      }
      
      // Step 2: Check initial dashboard state
      console.log('\n📊 STEP 1: Checking initial dashboard state...');
      const initialData = await this.fetchDashboardData();
      this.displayDashboardData(initialData, '📊 INITIAL DASHBOARD STATE');
      
      // Step 3: Trigger direct reset (bypass WebSocket)
      console.log('\n🔄 STEP 2: Triggering dashboard reset...');
      if (!await this.triggerDirectReset()) {
        throw new Error('Failed to trigger reset');
      }
      
      // Step 4: Wait for reset to complete
      console.log('\n⏳ STEP 3: Waiting for reset to complete...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 5: Check dashboard state after reset
      console.log('\n📊 STEP 4: Checking dashboard state after reset...');
      const afterResetData = await this.fetchDashboardData();
      this.displayDashboardData(afterResetData, '📊 DASHBOARD STATE AFTER RESET');
      
      // Step 6: Verify reset was successful
      console.log('\n✅ STEP 5: Verifying reset results...');
      const isResetSuccessful = 
        afterResetData.totals.totalRuntime === 0 &&
        afterResetData.totals.totalDowntime === 0 &&
        afterResetData.totals.totalStops === 0 &&
        afterResetData.systemAvailability === '0.0';
      
      if (isResetSuccessful) {
        console.log('🎉 SUCCESS: Dashboard reset completed successfully!');
        console.log('✅ All metrics have been reset to zero');
        console.log('✅ Assets table reset functionality is working');
      } else {
        console.log('❌ FAILURE: Dashboard reset did not work as expected');
        console.log('❌ Some metrics still show non-zero values');
        
        // Show comparison
        console.log('\n📊 COMPARISON:');
        console.log(`Runtime: ${this.formatTime(initialData.totals.totalRuntime)} → ${this.formatTime(afterResetData.totals.totalRuntime)}`);
        console.log(`Downtime: ${this.formatTime(initialData.totals.totalDowntime)} → ${this.formatTime(afterResetData.totals.totalDowntime)}`);
        console.log(`Stops: ${initialData.totals.totalStops} → ${afterResetData.totals.totalStops}`);
        console.log(`Availability: ${initialData.systemAvailability}% → ${afterResetData.systemAvailability}%`);
      }
      
      return isResetSuccessful;
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new CompleteDashboardResetTest();
  test.runCompleteTest().then(success => {
    console.log(`\n🏁 Test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Test crashed:', error.message);
    process.exit(1);
  });
}

module.exports = CompleteDashboardResetTest;