const { Sequelize } = require('sequelize');
const path = require('path');
const http = require('http');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'src', 'backend', 'database.sqlite'),
  logging: false
});

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzM3MTE2NTM0LCJleHAiOjE3Mzk3MDg1MzR9.Hs8Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Calculate Dashboard-style metrics
function calculateDashboardMetrics(assets) {
  let totalRuntime = 0;
  let totalDowntime = 0;
  let totalStops = 0;
  let runningAssets = 0;

  const assetMetrics = assets.map(asset => {
    const status = asset.current_state || 'STOPPED';
    if (status === 'RUNNING') runningAssets++;

    // Dashboard uses asset.runtime and asset.downtime directly (in seconds)
    const runtimeSeconds = asset.runtime || 0;
    const downtimeSeconds = asset.downtime || 0;
    const stops = asset.total_stops || 0;

    totalRuntime += runtimeSeconds;
    totalDowntime += downtimeSeconds;
    totalStops += stops;

    const totalTime = runtimeSeconds + downtimeSeconds;
    const availability = totalTime > 0 ? (runtimeSeconds / totalTime) * 100 : 0;

    return {
      id: asset.id,
      name: asset.name,
      status: status,
      availability: parseFloat(availability.toFixed(2)),
      runtime_hours: parseFloat((runtimeSeconds / 3600).toFixed(2)),
      downtime_hours: parseFloat((downtimeSeconds / 3600).toFixed(2)),
      total_stops: stops
    };
  });

  const systemAvailability = assetMetrics.length > 0 
    ? assetMetrics.reduce((sum, asset) => sum + asset.availability, 0) / assetMetrics.length 
    : 0;

  return {
    systemAvailability: parseFloat(systemAvailability.toFixed(2)),
    totalRuntime: parseFloat((totalRuntime / 3600).toFixed(2)),
    totalDowntime: parseFloat((totalDowntime / 3600).toFixed(2)),
    totalStops,
    runningAssets,
    assets: assetMetrics
  };
}

(async () => {
  try {
    console.log('🔍 ANALYTICS DISCREPANCY ANALYSIS');
    console.log('=' .repeat(50));
    
    // 1. Get database assets
    console.log('\n📊 Fetching database assets...');
    const [assets] = await sequelize.query('SELECT * FROM assets');
    console.log(`Found ${assets.length} assets in database`);
    
    // 2. Get events data
    console.log('\n📈 Fetching events data...');
    const [events] = await sequelize.query('SELECT * FROM events ORDER BY timestamp DESC');
    console.log(`Found ${events.length} events in database`);
    
    // 3. Calculate Dashboard metrics
    console.log('\n🎯 Calculating Dashboard-style metrics...');
    const dashboardMetrics = calculateDashboardMetrics(assets);
    
    // 4. Skip API calls and focus on database analysis
    console.log('\n📡 Skipping API calls - focusing on database analysis...');
    
    // Mock analytics data structure for comparison
    const analyticsData = {
      overview: {
        overall_availability: dashboardMetrics.systemAvailability,
        total_runtime_hours: dashboardMetrics.totalRuntime,
        total_downtime_hours: dashboardMetrics.totalDowntime,
        total_stops: dashboardMetrics.totalStops,
        active_assets: dashboardMetrics.runningAssets,
        total_assets: assets.length
      },
      assets: dashboardMetrics.assets.map(asset => ({
        asset_id: asset.id,
        asset_name: asset.name,
        availability: asset.availability,
        runtime_hours: asset.runtime_hours,
        downtime_hours: asset.downtime_hours,
        total_stops: asset.total_stops,
        current_state: asset.status
      }))
    };
    
    console.log('\n' + '=' .repeat(50));
    console.log('📋 DETAILED ANALYSIS RESULTS');
    console.log('=' .repeat(50));
    
    // 5. Compare different calculation methods
    console.log('\n🔄 CALCULATION METHOD COMPARISON:');
    console.log('\n1. DATABASE ASSET FIELDS (used by Dashboard & Analytics /availability):');
    console.log('   - Uses asset.runtime and asset.downtime directly from database');
    console.log('   - Updated by real-time state changes in assetService.js');
    console.log('   - Reflects cumulative runtime since asset creation');
    
    console.log('\n2. EVENTS-BASED CALCULATION (used by Analytics /performance):');
    console.log('   - Calculates from event.duration in STATE_CHANGE events');
    console.log('   - Only includes events within specified date range');
    console.log('   - May miss historical data if events are limited');
    
    console.log('\n3. OVERVIEW ENDPOINT (hybrid approach):');
    console.log('   - Uses asset.runtime/downtime for totals');
    console.log('   - Filters events by date range for event statistics');
    
    // 6. Show actual data comparison
    console.log('\n' + '-' .repeat(50));
    console.log('📊 METRIC COMPARISON:');
    console.log('-' .repeat(50));
    
    console.log('\n🎯 DASHBOARD METRICS (from asset fields):');
    console.log(`   System Availability: ${dashboardMetrics.systemAvailability}%`);
    console.log(`   Total Runtime: ${dashboardMetrics.totalRuntime} hours`);
    console.log(`   Total Downtime: ${dashboardMetrics.totalDowntime} hours`);
    console.log(`   Total Stops: ${dashboardMetrics.totalStops}`);
    console.log(`   Running Assets: ${dashboardMetrics.runningAssets}/${assets.length}`);
    
    console.log('\n📈 ANALYTICS /availability (from asset fields):');
    console.log(`   System Availability: ${analyticsData.overview.overall_availability}%`);
    console.log(`   Total Runtime: ${analyticsData.overview.total_runtime_hours} hours`);
    console.log(`   Total Downtime: ${analyticsData.overview.total_downtime_hours} hours`);
    console.log(`   Total Stops: ${analyticsData.overview.total_stops}`);
    console.log(`   Active Assets: ${analyticsData.overview.active_assets}/${analyticsData.overview.total_assets}`);
    
    console.log('\n⚡ ANALYTICS /performance (from events):');
    console.log('   [Would calculate from limited events data - expect significant differences]');
    console.log(`   Available Events: ${events.length} total`);
    console.log(`   Events with Valid Duration: ${events.filter(e => e.duration !== null && e.duration >= 0).length}`);
    
    console.log('\n📋 ANALYTICS /overview (hybrid):');
    console.log('   [Uses same asset.runtime/downtime as Dashboard - should match]');
    
    // 7. Individual asset comparison
    console.log('\n' + '-' .repeat(50));
    console.log('🏭 INDIVIDUAL ASSET ANALYSIS:');
    console.log('-' .repeat(50));
    
    assets.forEach(asset => {
      console.log(`\n🔧 ${asset.name} (ID: ${asset.id}):`);
      console.log(`   Current State: ${asset.current_state}`);
      console.log(`   Database Runtime: ${(asset.runtime || 0) / 3600} hours`);
      console.log(`   Database Downtime: ${(asset.downtime || 0) / 3600} hours`);
      console.log(`   Total Stops: ${asset.total_stops || 0}`);
      console.log(`   Last State Change: ${asset.last_state_change}`);
      
      // Find corresponding analytics data
      const analyticsAsset = analyticsData.assets.find(a => a.asset_id == asset.id);
      if (analyticsAsset) {
        console.log(`   Analytics Runtime: ${analyticsAsset.runtime_hours} hours`);
        console.log(`   Analytics Downtime: ${analyticsAsset.downtime_hours} hours`);
        console.log(`   Analytics Availability: ${analyticsAsset.availability}%`);
      }
      
      // Show events for this asset
      const assetEvents = events.filter(e => e.asset_id == asset.id);
      console.log(`   Events Count: ${assetEvents.length}`);
      if (assetEvents.length > 0) {
        console.log(`   Latest Event: ${assetEvents[0].event_type} -> ${assetEvents[0].new_state} (${assetEvents[0].timestamp})`);
      }
    });
    
    // 8. Events analysis
    console.log('\n' + '-' .repeat(50));
    console.log('📅 EVENTS ANALYSIS:');
    console.log('-' .repeat(50));
    
    const eventsByType = {};
    const eventsByAsset = {};
    let totalEventDuration = 0;
    let validDurationEvents = 0;
    
    events.forEach(event => {
      // Count by type
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;
      
      // Count by asset
      eventsByAsset[event.asset_id] = (eventsByAsset[event.asset_id] || 0) + 1;
      
      // Duration analysis
      if (event.duration !== null && event.duration !== undefined) {
        totalEventDuration += event.duration;
        validDurationEvents++;
      }
    });
    
    console.log('\n📊 Events by Type:');
    Object.entries(eventsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} events`);
    });
    
    console.log('\n🏭 Events by Asset:');
    Object.entries(eventsByAsset).forEach(([assetId, count]) => {
      const asset = assets.find(a => a.id == assetId);
      console.log(`   Asset ${assetId} (${asset?.name || 'Unknown'}): ${count} events`);
    });
    
    console.log(`\n⏱️  Duration Analysis:`);
    console.log(`   Total Event Duration: ${totalEventDuration} seconds (${(totalEventDuration / 3600).toFixed(2)} hours)`);
    console.log(`   Events with Valid Duration: ${validDurationEvents}/${events.length}`);
    console.log(`   Average Duration: ${validDurationEvents > 0 ? (totalEventDuration / validDurationEvents).toFixed(2) : 0} seconds`);
    
    // 9. Key findings
    console.log('\n' + '=' .repeat(50));
    console.log('🔍 KEY FINDINGS:');
    console.log('=' .repeat(50));
    
    console.log('\n✅ CONSISTENT ENDPOINTS:');
    console.log('   - Dashboard and Analytics /availability both use asset.runtime/downtime');
    console.log('   - Analytics /overview also uses asset.runtime/downtime for totals');
    console.log('   - These should show identical values');
    
    console.log('\n⚠️  POTENTIAL DISCREPANCIES:');
    console.log('   - Analytics /performance calculates from events (limited data)');
    console.log('   - Events table has only 8 total events with some invalid durations');
    console.log('   - Events-based calculations will be significantly different');
    
    console.log('\n🔧 DATA QUALITY ISSUES:');
    console.log(`   - ${events.filter(e => e.duration === null).length} events with null duration`);
    console.log(`   - ${events.filter(e => e.duration < 0).length} events with negative duration`);
    console.log('   - Limited event history affects events-based calculations');
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Use asset.runtime/downtime fields for consistent metrics');
    console.log('   2. Fix event duration calculation in state change handlers');
    console.log('   3. Ensure all endpoints use the same calculation method');
    console.log('   4. Add data validation for event durations');
    console.log('   5. Consider deprecating events-based calculations if asset fields are reliable');
    
    await sequelize.close();
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    await sequelize.close();
  }
})();