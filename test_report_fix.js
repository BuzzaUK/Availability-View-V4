const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

async function testReportGeneration() {
  try {
    console.log('Testing report generation fixes...');
    
    // Get available shifts
    const shifts = await databaseService.getAllShifts();
    console.log(`Found ${shifts.length} shifts`);
    
    if (shifts.length === 0) {
      console.log('No shifts found to test');
      return;
    }
    
    // Test with the first shift
    const shift = shifts[0];
    console.log(`Testing shift: ${shift.shift_name} (ID: ${shift.id})`);
    console.log(`Shift time: ${shift.start_time} to ${shift.end_time}`);
    
    // Generate report
    const report = await reportService.generateShiftReport(shift.id);
    
    console.log('\n=== REPORT METRICS ===');
    console.log(`Total Runtime: ${report.metrics.total_runtime} ms`);
    console.log(`Total Downtime: ${report.metrics.total_downtime} ms`);
    console.log(`Average Availability: ${report.metrics.average_availability.toFixed(2)}%`);
    console.log(`OEE Percentage: ${report.metrics.oee_percentage.toFixed(2)}%`);
    
    console.log('\n=== ASSETS ===');
    console.log(`Assets count: ${report.assets.length}`);
    report.assets.forEach(asset => {
      console.log(`- ${asset.asset_name}: ${asset.availability.toFixed(2)}% availability, ${asset.stops} stops`);
    });
    
    console.log('\n=== EVENTS ===');
    console.log(`Events count: ${report.events.length}`);
    const sampleEvents = report.events.slice(0, 3);
    sampleEvents.forEach(event => {
      console.log(`- ${event.timestamp_formatted}: ${event.asset_name} - ${event.event_type} (${event.duration_minutes.toFixed(2)} min)`);
    });
    
    console.log('\n=== TEST RESULTS ===');
    const hasValidMetrics = report.metrics.total_runtime > 0 || report.metrics.total_downtime > 0;
    const hasAssetNames = report.events.every(e => e.asset_name && e.asset_name !== 'Unknown Asset');
    const hasEventTypes = report.events.every(e => e.event_type);
    
    console.log(`✓ Valid metrics (runtime/downtime > 0): ${hasValidMetrics}`);
    console.log(`✓ Asset names populated: ${hasAssetNames}`);
    console.log(`✓ Event types populated: ${hasEventTypes}`);
    
    if (hasValidMetrics && hasAssetNames && hasEventTypes) {
      console.log('\n🎉 ALL TESTS PASSED! Report generation is working correctly.');
    } else {
      console.log('\n❌ Some issues remain. Check the details above.');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error.stack);
  }
}

testReportGeneration();