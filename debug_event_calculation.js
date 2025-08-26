const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

async function debugEventCalculation() {
  try {
    console.log('🔍 Debugging Event Calculation Logic');
    console.log('=' .repeat(60));
    
    const shiftId = 76; // Test with shift 76
    
    // Get shift data
    const shift = await databaseService.findShiftById(shiftId);
    if (!shift) {
      console.log('❌ Shift not found');
      return;
    }
    
    console.log(`✅ Shift found: ${shift.shift_name || shift.name}`);
    console.log(`   Start: ${shift.start_time}`);
    console.log(`   End: ${shift.end_time}`);
    
    // Get events
    const allEvents = await databaseService.getAllEvents();
    const allEventsArray = allEvents.rows || allEvents;
    const events = allEventsArray.filter(event => event.shift_id === shiftId);
    
    console.log(`\n📊 Events for Shift ${shiftId}:`);
    console.log(`   Total events: ${events.length}`);
    
    if (events.length > 0) {
      console.log('\n🔍 Event Details:');
      events.slice(0, 10).forEach((event, index) => {
        console.log(`   ${index + 1}. Asset: ${event.asset_id || event.asset}`);
        console.log(`      Type: ${event.event_type}`);
        console.log(`      State: ${event.new_state || event.newState || event.state}`);
        console.log(`      Duration: ${event.duration}ms`);
        console.log(`      Timestamp: ${event.timestamp}`);
        console.log(`      ---`);
      });
      
      if (events.length > 10) {
        console.log(`   ... and ${events.length - 10} more events`);
      }
    }
    
    // Get assets
    const allAssets = await databaseService.getAllAssets();
    console.log(`\n🏭 Assets: ${allAssets.length} total`);
    
    // Test the calculation logic manually
    console.log('\n🧮 Manual Calculation Test:');
    
    const shiftStart = new Date(shift.start_time);
    const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
    const shiftDuration = shiftEnd - shiftStart;
    
    console.log(`   Shift duration: ${shiftDuration}ms (${(shiftDuration / (1000 * 60 * 60)).toFixed(2)} hours)`);
    
    // Group events by asset
    const eventsByAsset = {};
    events.forEach(event => {
      const assetId = event.asset_id || event.asset;
      if (!eventsByAsset[assetId]) {
        eventsByAsset[assetId] = [];
      }
      eventsByAsset[assetId].push(event);
    });
    
    console.log(`\n📈 Asset-wise Event Analysis:`);
    
    for (const [assetId, assetEvents] of Object.entries(eventsByAsset)) {
      console.log(`\n   Asset ${assetId}: ${assetEvents.length} events`);
      
      let runtime = 0;
      let downtime = 0;
      let stops = 0;
      
      // Sort events by timestamp
      const sortedEvents = assetEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      console.log(`   Event sequence:`);
      
      for (let i = 0; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        const nextEvent = sortedEvents[i + 1];
        
        // Determine event duration
        let eventDuration = event.duration || 0;
        if (!eventDuration || eventDuration <= 0) {
          const start = new Date(event.timestamp);
          const end = nextEvent ? new Date(nextEvent.timestamp) : shiftEnd;
          eventDuration = Math.max(0, end - start);
        }
        
        // Normalize event types/states
        const typeVal = (event.event_type || '').toString().toUpperCase();
        const stateVal = (event.new_state || event.newState || event.state || '').toString().toUpperCase();
        
        let isStop = false;
        let isRun = false;
        
        if (typeVal === 'STATE_CHANGE' || typeVal === 'STATE' || typeVal === 'STATECHANGE') {
          if (stateVal === 'STOPPED' || stateVal === 'STOP') isStop = true;
          if (stateVal === 'RUNNING' || stateVal === 'START') isRun = true;
        } else if (typeVal === 'STOP' || stateVal === 'STOPPED' || stateVal === 'STOP') {
          isStop = true;
        } else if (typeVal === 'START' || typeVal === 'RUNNING' || stateVal === 'RUNNING' || stateVal === 'START') {
          isRun = true;
        }
        
        console.log(`     ${i + 1}. ${event.timestamp} - ${typeVal}/${stateVal} - ${eventDuration}ms - ${isStop ? 'STOP' : isRun ? 'RUN' : 'OTHER'}`);
        
        if (isStop) {
          stops++;
          downtime += eventDuration;
        } else if (isRun) {
          runtime += eventDuration;
        }
      }
      
      const totalTime = runtime + downtime;
      const availability = totalTime > 0 ? (runtime / totalTime) * 100 : 0;
      
      console.log(`   Results:`);
      console.log(`     Runtime: ${runtime}ms (${(runtime / 60000).toFixed(1)} min)`);
      console.log(`     Downtime: ${downtime}ms (${(downtime / 60000).toFixed(1)} min)`);
      console.log(`     Stops: ${stops}`);
      console.log(`     Availability: ${availability.toFixed(1)}%`);
    }
    
    // Now test the actual report service calculation
    console.log('\n🔧 Report Service Calculation:');
    const reportData = await reportService.generateShiftReport(shiftId, {
      includeAnalysis: true,
      includeCsv: false,
      includeHtml: false
    });
    
    console.log(`   Report metrics:`);
    console.log(`     availability_percentage: ${reportData.metrics.availability_percentage}`);
    console.log(`     runtime_minutes: ${reportData.metrics.runtime_minutes}`);
    console.log(`     downtime_minutes: ${reportData.metrics.downtime_minutes}`);
    console.log(`     total_stops: ${reportData.metrics.total_stops}`);
    
    console.log(`\n   Asset metrics from report:`);
    reportData.assets.forEach((asset, index) => {
      console.log(`     Asset ${asset.asset_id}: ${asset.availability.toFixed(1)}% availability, ${(asset.runtime / 60000).toFixed(1)}min runtime, ${asset.stops} stops`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugEventCalculation();