const databaseService = require('./src/backend/services/databaseService');

async function checkDurationFields() {
  console.log('=== Checking Duration Fields ===\n');
  
  try {
    const allArchives = await databaseService.getAllArchives();
    const shiftReports = allArchives.filter(archive => archive.archive_type === 'SHIFT_REPORT');
    
    if (shiftReports.length > 0) {
      const archive = shiftReports[0];
      const archivedData = archive.archived_data;
      const metrics = archivedData.shift_metrics || {};
      const meta = archivedData.generation_metadata || {};
      
      console.log('=== Archive Level ===');
      console.log('date_range_start:', archive.date_range_start);
      console.log('date_range_end:', archive.date_range_end);
      
      console.log('\n=== Generation Metadata ===');
      console.log('shift_duration_ms:', meta.shift_duration_ms);
      console.log('events_processed:', meta.events_processed);
      console.log('assets_analyzed:', meta.assets_analyzed);
      
      console.log('\n=== Shift Metrics Duration Fields ===');
      console.log('shift_duration:', metrics.shift_duration);
      console.log('total_runtime:', metrics.total_runtime);
      console.log('total_downtime:', metrics.total_downtime);
      console.log('runtime_minutes:', metrics.runtime_minutes);
      console.log('downtime_minutes:', metrics.downtime_minutes);
      console.log('planned_production_time:', metrics.planned_production_time);
      
      console.log('\n=== All Shift Metrics Keys ===');
      Object.keys(metrics).forEach(key => {
        console.log(`${key}:`, metrics[key]);
      });
      
      // Calculate duration from date range if available
      if (archive.date_range_start && archive.date_range_end) {
        const calculatedDuration = new Date(archive.date_range_end) - new Date(archive.date_range_start);
        console.log('\n=== Calculated from Date Range ===');
        console.log('Calculated duration (ms):', calculatedDuration);
        console.log('Calculated duration (minutes):', Math.round(calculatedDuration / 60000));
      }
      
    } else {
      console.log('No shift reports found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDurationFields().then(() => {
  console.log('\n=== Check Complete ===');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});