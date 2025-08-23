const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

(async () => {
  try {
    console.log('🔍 Verifying archived shift reports...');
    
    // Get all archived shift reports
    const archivedReports = await reportService.getArchivedShiftReports();
    console.log(`Found ${archivedReports.length} archived shift reports`);
    
    if (archivedReports.length === 0) {
      console.log('No archived shift reports found');
      process.exit(0);
    }
    
    // Get the first archived report for verification
    const firstReport = archivedReports[0];
    console.log('\n📊 Examining first archived report:');
    console.log(`  Title: ${firstReport.title}`);
    console.log(`  Created: ${firstReport.created_at}`);
    console.log(`  Status: ${firstReport.status}`);
    
    // Get the full archived report data
    const fullReport = await reportService.getArchivedShiftReport(firstReport.id);
    
    if (fullReport && fullReport.archived_data) {
      const archivedData = fullReport.archived_data;
      
      console.log('\n📈 Report Metrics:');
      
      // Check shift metrics
      if (archivedData.shift_metrics) {
        const metrics = archivedData.shift_metrics;
        console.log(`  Availability: ${metrics.availability || 'N/A'}%`);
        console.log(`  Performance: ${metrics.performance || 'N/A'}%`);
        console.log(`  Quality: ${metrics.quality || 'N/A'}%`);
        console.log(`  OEE: ${metrics.oee || 'N/A'}%`);
        console.log(`  Runtime: ${metrics.runtime_minutes || 'N/A'} minutes`);
        console.log(`  Downtime: ${metrics.downtime_minutes || 'N/A'} minutes`);
      }
      
      // Check asset performance
      if (archivedData.asset_performance && archivedData.asset_performance.length > 0) {
        console.log('\n🏭 Asset Performance:');
        archivedData.asset_performance.forEach((asset, index) => {
          console.log(`  Asset ${index + 1}: ${asset.name || 'Unknown'}`);
          console.log(`    Availability: ${asset.availability || 'N/A'}%`);
          console.log(`    Runtime: ${asset.runtime_minutes || 'N/A'} minutes`);
          console.log(`    Downtime: ${asset.downtime_minutes || 'N/A'} minutes`);
          console.log(`    Stops: ${asset.stop_count || 'N/A'}`);
        });
      }
      
      // Check if reports are available
      if (archivedData.reports) {
        console.log('\n📋 Available Report Formats:');
        Object.keys(archivedData.reports).forEach(format => {
          console.log(`  - ${format.toUpperCase()}`);
        });
      }
      
      // Check generation metadata
      if (archivedData.generation_metadata) {
        const metadata = archivedData.generation_metadata;
        console.log('\n🔧 Generation Metadata:');
        console.log(`  Events Processed: ${metadata.events_processed || 'N/A'}`);
        console.log(`  Assets Analyzed: ${metadata.assets_analyzed || 'N/A'}`);
      }
      
    } else {
      console.log('❌ No archived data found in report');
    }
    
    console.log('\n✅ Archived report verification complete');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error verifying archived reports:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();