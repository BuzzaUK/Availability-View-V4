const path = require('path');
const { sequelize } = require('./src/backend/config/database');
const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

async function regenerateShiftReports() {
  try {
    console.log('🔄 Starting shift report regeneration...');
    
    // Get all archived shift reports
    const archives = await databaseService.getAllArchives();
    const shiftReports = archives.filter(archive => archive.archive_type === 'SHIFT_REPORT');
    
    console.log(`📊 Found ${shiftReports.length} shift report archives to regenerate`);
    
    for (const archive of shiftReports) {
      try {
        console.log(`\n🔄 Processing archive ID ${archive.id}: ${archive.title}`);
        
        // Parse archived data to get shift ID
        const archivedData = typeof archive.archived_data === 'string' 
          ? JSON.parse(archive.archived_data) 
          : archive.archived_data;
        
        const shiftId = archivedData.shift_info?.id;
        if (!shiftId) {
          console.log(`⚠️  No shift ID found in archive ${archive.id}, skipping`);
          continue;
        }
        
        console.log(`🔍 Regenerating report for shift ID: ${shiftId}`);
        
        // Generate fresh report data
        const reportData = await reportService.generateShiftReport(shiftId, {
          includeCsv: false,
          includeHtml: false,
          includeAnalysis: false
        });
        
        // Create new archived data with proper runtime/downtime metrics
        const newArchivedData = {
          ...archivedData,
          asset_performance: reportData.assets.map(asset => ({
            asset_id: asset.asset_id,
            asset_name: asset.asset_name,
            pin_number: asset.pin_number,
            location: asset.location,
            runtime: asset.runtime,
            downtime: asset.downtime,
            runtime_minutes: Math.round(asset.runtime / 60000), // Convert ms to minutes
            downtime_minutes: Math.round(asset.downtime / 60000), // Convert ms to minutes
            availability: asset.availability,
            performance: asset.performance,
            quality: asset.quality,
            oee: asset.oee,
            total_events: asset.total_events,
            running_events: asset.running_events,
            stopped_events: asset.stopped_events
          })),
          shift_metrics: {
            total_runtime: reportData.metrics.total_runtime,
            total_downtime: reportData.metrics.total_downtime,
            runtime_minutes: Math.round(reportData.metrics.total_runtime / 60000),
            downtime_minutes: Math.round(reportData.metrics.total_downtime / 60000),
            availability: reportData.metrics.availability,
            performance: reportData.metrics.performance,
            quality: reportData.metrics.quality,
            oee: reportData.metrics.oee,
            events_processed: reportData.metrics.events_processed
          }
        };
        
        // Update the archive with new data
        await databaseService.updateArchive(archive.id, {
          archived_data: newArchivedData
        });
        
        console.log(`✅ Updated archive ${archive.id} with runtime: ${Math.round(reportData.metrics.total_runtime / 60000)}min, downtime: ${Math.round(reportData.metrics.total_downtime / 60000)}min`);
        
      } catch (error) {
        console.error(`❌ Error processing archive ${archive.id}:`, error.message);
      }
    }
    
    console.log('\n🎉 Shift report regeneration completed!');
    
  } catch (error) {
    console.error('❌ Error during regeneration:', error);
  } finally {
    await sequelize.close();
  }
}

regenerateShiftReports();