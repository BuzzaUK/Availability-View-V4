// Redirect database logging to suppress output
const fs = require('fs');
const originalLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('Executing (default):')) {
    // Suppress database query logs
    return;
  }
  originalLog(...args);
};

const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

async function finalTest() {
  try {
    originalLog('\n=== FINAL REPORT TEST ===');
    
    const shifts = await databaseService.getAllShifts();
    originalLog(`Found ${shifts.length} shifts`);
    
    if (shifts.length === 0) {
      originalLog('No shifts to test');
      return;
    }
    
    const shift = shifts[0];
    originalLog(`Testing: ${shift.shift_name} (ID: ${shift.id})`);
    
    const report = await reportService.generateShiftReport(shift.id);
    
    originalLog('\n=== RESULTS ===');
    originalLog(`Report type: ${typeof report}`);
    originalLog(`Report is null: ${report === null}`);
    originalLog(`Report is undefined: ${report === undefined}`);
    
    if (report) {
       originalLog(`Report keys: ${Object.keys(report)}`);
       originalLog(`Assets: ${report.assets ? report.assets.length : 'UNDEFINED'}`);
       originalLog(`Metrics: ${report.metrics ? 'EXISTS' : 'UNDEFINED'}`);
       originalLog(`Analytics Summary: ${report.analyticsSummary ? 'EXISTS' : 'UNDEFINED'}`);
       
       if (report.metrics) {
         originalLog(`Runtime: ${report.metrics.total_runtime} min`);
         originalLog(`Downtime: ${report.metrics.total_downtime} min`);
         originalLog(`Availability: ${report.metrics.average_availability}%`);
         originalLog(`OEE: ${report.metrics.oee_percentage || report.metrics.oee}%`);
       }
       
       if (report.assets && report.assets.length > 0) {
         const firstAsset = report.assets[0];
         originalLog(`\nFirst Asset:`);
         originalLog(`- Name: ${firstAsset.asset_name}`);
         originalLog(`- Availability: ${firstAsset.availability}%`);
         originalLog(`- Runtime: ${firstAsset.runtime} min`);
         originalLog(`- Downtime: ${firstAsset.downtime} min`);
         originalLog(`- Stops: ${firstAsset.stops}`);
       }
       
       if (report.analyticsSummary) {
         originalLog(`\nAnalytics Summary:`);
         originalLog(`- Executive: ${report.analyticsSummary.executive_summary}`);
         originalLog(`- Overall Availability: ${report.analyticsSummary.key_metrics?.overallAvailability}%`);
       }
     } else {
       originalLog('❌ Report is null or undefined');
     }
    
    if (report && report.events && report.events.length > 0) {
      const event = report.events[0];
      originalLog(`\nSample Event:`);
      originalLog(`- Asset: '${event.asset_name}'`);
      originalLog(`- Type: '${event.event_type}'`);
      originalLog(`- Duration: ${event.duration_minutes} min`);
    }
    
    // Check if fixes worked
    const metricsFixed = report && report.metrics && (report.metrics.total_runtime > 0 || report.metrics.total_downtime > 0);
    const assetsFixed = report && report.events && report.events.some(e => e.asset_name && e.asset_name !== '' && e.asset_name !== 'Unknown Asset');
    const typesFixed = report && report.events && report.events.some(e => e.event_type && e.event_type !== '');
    
    originalLog('\n=== FIX STATUS ===');
    originalLog(`Metrics Fixed: ${metricsFixed ? '✓ YES' : '✗ NO'}`);
    originalLog(`Asset Names Fixed: ${assetsFixed ? '✓ YES' : '✗ NO'}`);
    originalLog(`Event Types Fixed: ${typesFixed ? '✓ YES' : '✗ NO'}`);
    
    if (metricsFixed && assetsFixed && typesFixed) {
      originalLog('\n🎉 ALL FIXES SUCCESSFUL!');
    } else {
      originalLog('\n⚠️  Some fixes still need work');
    }
    
  } catch (error) {
    originalLog('Error:', error.message);
    originalLog('Full stack trace:', error.stack);
  }
}

finalTest();