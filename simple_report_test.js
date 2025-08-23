const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

// Suppress database query logging
process.env.NODE_ENV = 'production';

async function testReport() {
  try {
    console.log('Testing Report Generation...');
    
    const shifts = await databaseService.getAllShifts();
    if (shifts.length === 0) {
      console.log('No shifts found');
      return;
    }
    
    const shift = shifts[0];
    console.log(`\nTesting shift: ${shift.shift_name} (ID: ${shift.id})`);
    
    const report = await reportService.generateShiftReport(shift.id);
    
    console.log('\n=== REPORT RESULTS ===');
    console.log(`Events: ${report.events.length}`);
    console.log(`Assets: ${report.assets.length}`);
    
    console.log('\n=== METRICS ===');
    console.log(`Runtime: ${report.metrics.total_runtime} minutes`);
    console.log(`Downtime: ${report.metrics.total_downtime} minutes`);
    console.log(`Availability: ${report.metrics.average_availability}%`);
    console.log(`OEE: ${report.metrics.oee_percentage}%`);
    
    if (report.events.length > 0) {
      console.log('\n=== SAMPLE EVENT ===');
      const event = report.events[0];
      console.log(`Asset Name: '${event.asset_name}'`);
      console.log(`Event Type: '${event.event_type}'`);
      console.log(`Duration: ${event.duration_minutes} minutes`);
    }
    
    // Test if our fixes worked
    const hasValidMetrics = report.metrics.total_runtime > 0 || report.metrics.total_downtime > 0;
    const hasAssetNames = report.events.some(e => e.asset_name && e.asset_name !== '');
    const hasEventTypes = report.events.some(e => e.event_type && e.event_type !== '');
    
    console.log('\n=== FIX VERIFICATION ===');
    console.log(`✓ Valid Metrics: ${hasValidMetrics ? 'YES' : 'NO'}`);
    console.log(`✓ Asset Names Populated: ${hasAssetNames ? 'YES' : 'NO'}`);
    console.log(`✓ Event Types Populated: ${hasEventTypes ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testReport();