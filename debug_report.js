const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

async function debugReport() {
  try {
    console.log('=== Debug Report Generation ===');
    
    // Check shifts
    const shifts = await databaseService.getAllShifts();
    console.log('Available shifts:', shifts.length);
    
    if (shifts.length === 0) {
      console.log('No shifts found in database');
      return;
    }
    
    const shift = shifts[0];
    console.log('Testing shift:', shift.shift_name, 'ID:', shift.id);
    console.log('Shift times:', shift.start_time, 'to', shift.end_time);
    
    // Check events
    const allEventsResult = await databaseService.getAllEvents();
    const allEvents = allEventsResult.rows || allEventsResult;
    console.log('Total events in database:', allEventsResult.count || allEvents.length);
    
    // Check assets
    const assets = await databaseService.getAllAssets();
    console.log('Total assets:', assets.length);
    if (assets.length > 0) {
      console.log('Sample asset:', assets[0].name, 'ID:', assets[0].id);
    }
    
    // Generate report
    console.log('\n=== Generating Report ===');
    const report = await reportService.generateShiftReport(shift.id);
    
    console.log('Report generated successfully');
    console.log('Events in report:', report.events.length);
    console.log('Assets in report:', report.assets.length);
    
    if (report.events.length > 0) {
      const sampleEvent = report.events[0];
      console.log('Sample event:', {
        asset_name: sampleEvent.asset_name,
        event_type: sampleEvent.event_type,
        duration: sampleEvent.duration_minutes,
        timestamp: sampleEvent.timestamp_formatted
      });
    }
    
    console.log('\n=== Metrics ===');
    console.log('Total Runtime:', report.metrics.total_runtime, 'minutes');
    console.log('Total Downtime:', report.metrics.total_downtime, 'minutes');
    console.log('Average Availability:', report.metrics.average_availability, '%');
    console.log('OEE:', report.metrics.oee_percentage, '%');
    
  } catch (error) {
    console.error('Error during debug:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugReport();