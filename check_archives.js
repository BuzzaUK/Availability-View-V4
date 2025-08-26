const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== CHECKING ARCHIVED SHIFT REPORT DATA ===\n');

db.get(`SELECT * FROM archives WHERE archive_type = 'SHIFT_REPORT' ORDER BY id DESC LIMIT 1`, (err, archive) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  if (!archive) {
    console.log('❌ No shift report found');
    db.close();
    return;
  }
  
  console.log('✅ Found archived shift report:');
  console.log('Archive ID:', archive.id);
  console.log('Title:', archive.title);
  console.log('Created:', new Date(archive.created_at).toLocaleString());
  
  try {
    const data = JSON.parse(archive.archived_data);
    console.log('\n📊 Archived Data Analysis:');
    console.log('  Shift ID:', data.shift_id);
    console.log('  Events processed:', data.generation_metadata?.events_processed || 0);
    console.log('  Assets analyzed:', data.generation_metadata?.assets_analyzed || 0);
    console.log('  Data source:', data.generation_metadata?.data_source || 'unknown');
    
    console.log('\n🏭 Asset Performance Data:');
    if (data.asset_performance && data.asset_performance.length > 0) {
      data.asset_performance.forEach((asset, i) => {
        console.log(`    Asset ${i+1}: ${asset.name}`);
        console.log(`      Runtime: ${asset.runtime_minutes} minutes`);
        console.log(`      Downtime: ${asset.downtime_minutes} minutes`);
        console.log(`      Stops: ${asset.stop_count}`);
        console.log(`      Availability: ${asset.availability}%`);
        console.log(`      Total time: ${asset.total_time_minutes} minutes`);
        console.log('');
      });
    } else {
      console.log('    ❌ No asset performance data found');
    }
    
    console.log('📈 Shift Metrics:');
    if (data.shift_metrics) {
      console.log('  Availability:', data.shift_metrics.availability_percentage + '%');
      console.log('  Runtime:', data.shift_metrics.runtime_minutes, 'minutes');
      console.log('  Downtime:', data.shift_metrics.downtime_minutes, 'minutes');
      console.log('  Total stops:', data.shift_metrics.total_stops);
    } else {
      console.log('  ❌ No shift metrics found');
    }
    
  } catch (e) {
    console.log('❌ Parse error:', e.message);
  }
  
  db.close();
});