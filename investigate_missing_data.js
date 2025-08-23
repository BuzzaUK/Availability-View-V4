const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

/**
 * Comprehensive investigation of missing data in shift reports and event archives
 */
async function investigateMissingData() {
  try {
    console.log('🔍 INVESTIGATING MISSING DATA IN SHIFT REPORTS AND EVENT ARCHIVES');
    console.log('=' .repeat(80));
    
    // Step 1: Check current shift and events
    console.log('\n1️⃣ CHECKING CURRENT SHIFT AND EVENTS');
    const currentShift = await databaseService.getCurrentShift();
    if (currentShift) {
      console.log(`Current shift: ${currentShift.shift_name} (ID: ${currentShift.id})`);
      console.log(`Start time: ${currentShift.start_time}`);
      console.log(`End time: ${currentShift.end_time || 'Ongoing'}`);
      
      // Get events for current shift
      const allEvents = await databaseService.getAllEvents();
      const allEventsArray = allEvents.rows || allEvents;
      
      const shiftStart = new Date(currentShift.start_time);
      const shiftEnd = currentShift.end_time ? new Date(currentShift.end_time) : new Date();
      
      const shiftEvents = allEventsArray.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= shiftStart && eventDate <= shiftEnd;
      });
      
      console.log(`Total events in system: ${allEventsArray.length}`);
      console.log(`Events in current shift time range: ${shiftEvents.length}`);
      
      if (shiftEvents.length > 0) {
        const eventTypes = [...new Set(shiftEvents.map(e => e.event_type))];
        console.log(`Event types: ${eventTypes.join(', ')}`);
        
        const assetsWithEvents = [...new Set(shiftEvents.map(e => e.asset_id))];
        console.log(`Assets with events: ${assetsWithEvents.length}`);
      }
    } else {
      console.log('❌ No current shift found');
    }
    
    // Step 2: Check recent archives
    console.log('\n2️⃣ CHECKING RECENT ARCHIVES');
    const allArchives = await databaseService.getAllArchives();
    const eventArchives = allArchives.filter(a => a.archive_type === 'EVENTS');
    const reportArchives = allArchives.filter(a => a.archive_type === 'SHIFT_REPORT');
    
    console.log(`Total archives: ${allArchives.length}`);
    console.log(`Event archives: ${eventArchives.length}`);
    console.log(`Report archives: ${reportArchives.length}`);
    
    // Analyze recent event archives
    if (eventArchives.length > 0) {
      console.log('\n📦 ANALYZING RECENT EVENT ARCHIVES:');
      const recentEventArchives = eventArchives.slice(0, 3);
      
      for (const archive of recentEventArchives) {
        console.log(`\nArchive: ${archive.title} (ID: ${archive.id})`);
        console.log(`Created: ${archive.created_at}`);
        console.log(`Status: ${archive.status}`);
        
        if (archive.archived_data) {
          const data = archive.archived_data;
          console.log(`Event count: ${data.event_count || 'Not specified'}`);
          console.log(`Events array length: ${data.events ? data.events.length : 'No events array'}`);
          console.log(`Shift info: ${data.shift_info ? 'Present' : 'Missing'}`);
          console.log(`Assets summary: ${data.assets_summary ? 'Present' : 'Missing'}`);
          
          if (data.events && data.events.length > 0) {
            const eventTypes = [...new Set(data.events.map(e => e.event_type))];
            console.log(`Archived event types: ${eventTypes.join(', ')}`);
          }
        } else {
          console.log('❌ No archived_data found');
        }
      }
    }
    
    // Analyze recent report archives
    if (reportArchives.length > 0) {
      console.log('\n📊 ANALYZING RECENT REPORT ARCHIVES:');
      const recentReportArchives = reportArchives.slice(0, 3);
      
      for (const archive of recentReportArchives) {
        console.log(`\nReport Archive: ${archive.title} (ID: ${archive.id})`);
        console.log(`Created: ${archive.created_at}`);
        console.log(`Status: ${archive.status}`);
        
        if (archive.archived_data) {
          const data = archive.archived_data;
          console.log(`Shift ID: ${data.shift_id || 'Not specified'}`);
          console.log(`Report formats: ${data.report_formats ? data.report_formats.join(', ') : 'None'}`);
          console.log(`Shift metrics: ${data.shift_metrics ? 'Present' : 'Missing'}`);
          console.log(`Asset performance: ${data.asset_performance ? data.asset_performance.length + ' assets' : 'Missing'}`);
          console.log(`Reports: ${data.reports ? Object.keys(data.reports).join(', ') : 'None'}`);
          console.log(`Generation metadata: ${data.generation_metadata ? 'Present' : 'Missing'}`);
          
          if (data.generation_metadata) {
            const meta = data.generation_metadata;
            console.log(`  - Events processed: ${meta.events_processed || 'Not specified'}`);
            console.log(`  - Assets analyzed: ${meta.assets_analyzed || 'Not specified'}`);
            console.log(`  - Data source: ${meta.data_source || 'Not specified'}`);
          }
          
          if (data.shift_metrics) {
            const metrics = data.shift_metrics;
            console.log(`  - Total runtime: ${metrics.total_runtime || 'Not specified'}`);
            console.log(`  - Total downtime: ${metrics.total_downtime || 'Not specified'}`);
            console.log(`  - Total stops: ${metrics.total_stops || 'Not specified'}`);
            console.log(`  - Availability: ${metrics.availability_percentage || metrics.availability || 'Not specified'}%`);
          }
        } else {
          console.log('❌ No archived_data found');
        }
      }
    }
    
    // Step 3: Test report generation process
    if (currentShift && currentShift.status === 'completed') {
      console.log('\n3️⃣ TESTING REPORT GENERATION PROCESS');
      try {
        console.log('Generating test report for completed shift...');
        const reportResult = await reportService.generateShiftReport(currentShift.id);
        
        console.log('Report generation successful:');
        console.log(`- Events processed: ${reportResult.events ? reportResult.events.length : 'No events'}`);
        console.log(`- Assets analyzed: ${reportResult.assets ? reportResult.assets.length : 'No assets'}`);
        console.log(`- Metrics calculated: ${reportResult.metrics ? 'Yes' : 'No'}`);
        
        if (reportResult.metrics) {
          const m = reportResult.metrics;
          console.log(`  - Runtime: ${m.runtime_minutes || m.total_runtime || 'Not calculated'} minutes`);
          console.log(`  - Downtime: ${m.downtime_minutes || m.total_downtime || 'Not calculated'} minutes`);
          console.log(`  - Stops: ${m.total_stops || 'Not calculated'}`);
          console.log(`  - Availability: ${m.availability_percentage || m.availability || 'Not calculated'}%`);
        }
        
      } catch (reportError) {
        console.log('❌ Report generation failed:', reportError.message);
      }
    }
    
    // Step 4: Test archiving process
    console.log('\n4️⃣ TESTING EVENT ARCHIVING PROCESS');
    if (currentShift) {
      try {
        console.log('Testing getEventsForArchiving...');
        const archiveQuery = {
          startDate: currentShift.start_time,
          endDate: currentShift.end_time || new Date(),
          shift_id: currentShift.id
        };
        
        const archiveResult = await databaseService.getEventsForArchiving(archiveQuery);
        console.log('Archive query successful:');
        console.log(`- Events found: ${archiveResult.events ? archiveResult.events.length : 'No events'}`);
        console.log(`- Metadata present: ${archiveResult.metadata ? 'Yes' : 'No'}`);
        
        if (archiveResult.metadata) {
          const meta = archiveResult.metadata;
          console.log(`  - Total events: ${meta.totalEvents}`);
          console.log(`  - Date range: ${meta.dateRange.start} to ${meta.dateRange.end}`);
          console.log(`  - Data integrity verified: ${meta.dataIntegrity.verified}`);
        }
        
      } catch (archiveError) {
        console.log('❌ Archive query failed:', archiveError.message);
      }
    }
    
    // Step 5: Identify potential issues
    console.log('\n5️⃣ POTENTIAL ISSUES IDENTIFIED');
    console.log('=' .repeat(50));
    
    const issues = [];
    
    if (eventArchives.length === 0) {
      issues.push('❌ No event archives found - archiving may not be working');
    }
    
    if (reportArchives.length === 0) {
      issues.push('❌ No report archives found - report archiving may not be working');
    }
    
    // Check for archives with missing data
    const archivesWithMissingData = [...eventArchives, ...reportArchives].filter(archive => {
      return !archive.archived_data || 
             (archive.archive_type === 'EVENTS' && (!archive.archived_data.events || archive.archived_data.events.length === 0)) ||
             (archive.archive_type === 'SHIFT_REPORT' && !archive.archived_data.shift_metrics);
    });
    
    if (archivesWithMissingData.length > 0) {
      issues.push(`❌ ${archivesWithMissingData.length} archives found with missing or empty data`);
    }
    
    // Check for generation metadata issues
    const reportArchivesWithoutMetadata = reportArchives.filter(archive => 
      !archive.archived_data?.generation_metadata?.events_processed
    );
    
    if (reportArchivesWithoutMetadata.length > 0) {
      issues.push(`⚠️ ${reportArchivesWithoutMetadata.length} report archives missing generation metadata`);
    }
    
    if (issues.length === 0) {
      console.log('✅ No obvious issues detected in archive structure');
    } else {
      issues.forEach(issue => console.log(issue));
    }
    
    console.log('\n🔍 INVESTIGATION COMPLETE');
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    console.error(error.stack);
  }
}

// Run the investigation
if (require.main === module) {
  investigateMissingData().then(() => {
    console.log('\n✅ Investigation completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Investigation failed:', error.message);
    process.exit(1);
  });
}

module.exports = { investigateMissingData };