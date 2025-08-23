const { Sequelize } = require('sequelize');
const path = require('path');

// Direct SQLite connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'src', 'backend', 'database.sqlite'),
  logging: false
});

async function checkCurrentAssets() {
  try {
    console.log('🔍 Checking current asset data directly from database...');
    
    // Query assets directly
    const [assets] = await sequelize.query(`
      SELECT 
        name, 
        runtime, 
        downtime, 
        current_state, 
        last_state_change, 
        total_stops,
        availability_percentage
      FROM assets
    `);
    
    console.log(`\nFound ${assets.length} assets:`);
    console.log('=' .repeat(60));
    
    assets.forEach(asset => {
      console.log(`📊 ${asset.name}:`);
      console.log(`   Runtime: ${asset.runtime || 0} seconds (${((asset.runtime || 0) / 60).toFixed(2)} minutes)`);
      console.log(`   Downtime: ${asset.downtime || 0} seconds (${((asset.downtime || 0) / 60).toFixed(2)} minutes)`);
      console.log(`   Current State: ${asset.current_state || 'UNKNOWN'}`);
      console.log(`   Last State Change: ${asset.last_state_change || 'Never'}`);
      console.log(`   Total Stops: ${asset.total_stops || 0}`);
      console.log(`   Availability: ${asset.availability_percentage || 0}%`);
      
      // Calculate time since last state change if available
      if (asset.last_state_change) {
        const lastChange = new Date(asset.last_state_change);
        const now = new Date();
        const timeSinceChange = Math.floor((now - lastChange) / 1000);
        console.log(`   Time Since Last Change: ${timeSinceChange} seconds (${(timeSinceChange / 60).toFixed(2)} minutes)`);
        
        // Calculate what Dashboard would show (real-time calculation)
        let dashboardRuntime = asset.runtime || 0;
        let dashboardDowntime = asset.downtime || 0;
        
        if (asset.current_state === 'RUNNING') {
          dashboardRuntime += timeSinceChange;
        } else if (asset.current_state === 'STOPPED') {
          dashboardDowntime += timeSinceChange;
        }
        
        console.log(`   📈 Dashboard Runtime: ${dashboardRuntime} seconds (${(dashboardRuntime / 60).toFixed(2)} minutes)`);
        console.log(`   📉 Dashboard Downtime: ${dashboardDowntime} seconds (${(dashboardDowntime / 60).toFixed(2)} minutes)`);
        
        // Calculate availability
        const totalTime = dashboardRuntime + dashboardDowntime;
        const availability = totalTime > 0 ? ((dashboardRuntime / totalTime) * 100).toFixed(2) : 0;
        console.log(`   📊 Dashboard Availability: ${availability}%`);
      }
      console.log('');
    });
    
    // Calculate system totals
    let totalDbRuntime = 0;
    let totalDbDowntime = 0;
    let totalDashboardRuntime = 0;
    let totalDashboardDowntime = 0;
    
    assets.forEach(asset => {
      totalDbRuntime += asset.runtime || 0;
      totalDbDowntime += asset.downtime || 0;
      
      let dashboardRuntime = asset.runtime || 0;
      let dashboardDowntime = asset.downtime || 0;
      
      if (asset.last_state_change) {
        const lastChange = new Date(asset.last_state_change);
        const now = new Date();
        const timeSinceChange = Math.floor((now - lastChange) / 1000);
        
        if (asset.current_state === 'RUNNING') {
          dashboardRuntime += timeSinceChange;
        } else if (asset.current_state === 'STOPPED') {
          dashboardDowntime += timeSinceChange;
        }
      }
      
      totalDashboardRuntime += dashboardRuntime;
      totalDashboardDowntime += dashboardDowntime;
    });
    
    console.log('🌐 SYSTEM TOTALS:');
    console.log('=' .repeat(60));
    console.log(`Database Runtime: ${totalDbRuntime} seconds (${(totalDbRuntime / 60).toFixed(2)} minutes)`);
    console.log(`Database Downtime: ${totalDbDowntime} seconds (${(totalDbDowntime / 60).toFixed(2)} minutes)`);
    console.log(`Dashboard Runtime: ${totalDashboardRuntime} seconds (${(totalDashboardRuntime / 60).toFixed(2)} minutes)`);
    console.log(`Dashboard Downtime: ${totalDashboardDowntime} seconds (${(totalDashboardDowntime / 60).toFixed(2)} minutes)`);
    
    const totalTime = totalDashboardRuntime + totalDashboardDowntime;
    const systemAvailability = totalTime > 0 ? ((totalDashboardRuntime / totalTime) * 100).toFixed(2) : 0;
    console.log(`System Availability: ${systemAvailability}%`);
    
    console.log('\n🔍 ANALYSIS:');
    console.log('=' .repeat(60));
    if (totalDbRuntime === 0 && totalDashboardRuntime > 0) {
      console.log('⚠️  DISCREPANCY FOUND:');
      console.log('   - Database shows 0 runtime');
      console.log('   - Dashboard shows real-time runtime from current state');
      console.log('   - This suggests Analytics uses database values only');
      console.log('   - Dashboard adds real-time calculations');
    } else if (totalDbRuntime > 0) {
      console.log('✅ Database contains runtime data');
    } else {
      console.log('❌ No runtime data found in database or real-time');
    }
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error checking assets:', error);
    process.exit(1);
  }
}

checkCurrentAssets();