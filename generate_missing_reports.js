const path = require('path');
const { Sequelize } = require('sequelize');

// Initialize database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

// Import the report service
const reportService = require('./src/backend/services/reportService');

async function generateMissingReports() {
  try {
    console.log('🔍 GENERATING MISSING SHIFT REPORTS...\n');

    // Get all shifts
    const [shifts] = await sequelize.query(`
      SELECT 
        id,
        shift_name,
        start_time,
        end_time,
        status,
        archived
      FROM shifts 
      WHERE archived = 0
      ORDER BY start_time DESC
    `);

    // Get all archived shift reports
    const [archives] = await sequelize.query(`
      SELECT 
        id,
        title,
        archived_data
      FROM archives 
      WHERE archive_type = 'SHIFT_REPORT'
    `);

    // Extract shift IDs that already have reports
    const shiftIdsWithReports = new Set();
    archives.forEach(archive => {
      try {
        const archivedData = JSON.parse(archive.archived_data);
        if (archivedData.shift_id) {
          shiftIdsWithReports.add(archivedData.shift_id);
        }
      } catch (e) {
        console.warn('Could not parse archived data for archive ID:', archive.id);
      }
    });

    // Find completed shifts without reports
    const completedShiftsWithoutReports = shifts.filter(shift => 
      shift.status === 'completed' && 
      shift.end_time && 
      !shiftIdsWithReports.has(shift.id)
    );

    console.log(`📊 Total shifts: ${shifts.length}`);
    console.log(`📊 Shifts with reports: ${shiftIdsWithReports.size}`);
    console.log(`📊 Completed shifts without reports: ${completedShiftsWithoutReports.length}\n`);

    if (completedShiftsWithoutReports.length === 0) {
      console.log('✅ All completed shifts already have archived reports!');
      return;
    }

    console.log('🔧 Generating reports for completed shifts without archives...');
    
    let successCount = 0;
    let failureCount = 0;

    for (const shift of completedShiftsWithoutReports) {
      try {
        console.log(`\n📊 Generating report for Shift ${shift.id}: ${shift.shift_name}`);
        console.log(`   Start: ${shift.start_time}`);
        console.log(`   End: ${shift.end_time}`);
        
        // Generate and archive the shift report using the service directly
        console.log(`   🔧 Calling generateAndArchiveShiftReportFromShift...`);
        const reportResult = await reportService.generateAndArchiveShiftReportFromShift(shift.id, {
          includeCsv: true,
          includeHtml: true,
          includeAnalysis: true
        });
        
        console.log(`   📊 Report result:`, {
          success: reportResult.success,
          archiveId: reportResult.reportArchive?.id,
          hasReports: !!reportResult.reports,
          hasMetrics: !!reportResult.metrics
        });
        
        if (reportResult.success) {
          console.log(`   ✅ Successfully generated report (Archive ID: ${reportResult.reportArchive?.id})`);
          successCount++;
        } else {
          console.log(`   ❌ Failed to generate report: ${reportResult.message || 'Unknown error'}`);
          failureCount++;
        }
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Error generating report for Shift ${shift.id}:`, error.message);
        failureCount++;
      }
    }

    console.log('\n📝 GENERATION SUMMARY:');
    console.log(`   ✅ Successfully generated: ${successCount}`);
    console.log(`   ❌ Failed to generate: ${failureCount}`);
    console.log(`   📊 Total processed: ${successCount + failureCount}`);

  } catch (error) {
    console.error('❌ Error during report generation:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the generation
generateMissingReports()
  .then(() => {
    console.log('\n🎉 Missing report generation completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });