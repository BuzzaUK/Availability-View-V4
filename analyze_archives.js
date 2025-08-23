const databaseService = require('./src/backend/services/databaseService');

/**
 * Focused analysis of archive data completeness
 */
async function analyzeArchives() {
  try {
    console.log('📊 ARCHIVE DATA COMPLETENESS ANALYSIS');
    console.log('=' .repeat(60));
    
    // Get all archives
    const allArchives = await databaseService.getAllArchives();
    const eventArchives = allArchives.filter(a => a.archive_type === 'EVENTS');
    const reportArchives = allArchives.filter(a => a.archive_type === 'SHIFT_REPORT');
    
    console.log(`\nTotal archives: ${allArchives.length}`);
    console.log(`Event archives: ${eventArchives.length}`);
    console.log(`Report archives: ${reportArchives.length}`);
    
    // Analyze event archives for missing data
    console.log('\n🔍 EVENT ARCHIVES ANALYSIS:');
    let eventArchivesWithIssues = 0;
    
    for (const archive of eventArchives.slice(0, 5)) {
      console.log(`\n📦 Archive: ${archive.title}`);
      console.log(`   ID: ${archive.id}, Created: ${new Date(archive.created_at).toLocaleString()}`);
      
      if (!archive.archived_data) {
        console.log('   ❌ ISSUE: No archived_data found');
        eventArchivesWithIssues++;
        continue;
      }
      
      const data = archive.archived_data;
      const issues = [];
      
      if (!data.events || data.events.length === 0) {
        issues.push('No events array or empty events');
      }
      
      if (!data.shift_info) {
        issues.push('Missing shift_info');
      }
      
      if (!data.assets_summary) {
        issues.push('Missing assets_summary');
      }
      
      if (data.event_count !== (data.events ? data.events.length : 0)) {
        issues.push(`Event count mismatch: claimed ${data.event_count}, actual ${data.events ? data.events.length : 0}`);
      }
      
      if (issues.length > 0) {
        console.log(`   ❌ ISSUES: ${issues.join(', ')}`);
        eventArchivesWithIssues++;
      } else {
        console.log(`   ✅ Complete: ${data.events.length} events, shift info present, assets summary present`);
      }
    }
    
    // Analyze report archives for missing data
    console.log('\n📈 REPORT ARCHIVES ANALYSIS:');
    let reportArchivesWithIssues = 0;
    
    for (const archive of reportArchives.slice(0, 5)) {
      console.log(`\n📊 Report: ${archive.title}`);
      console.log(`   ID: ${archive.id}, Created: ${new Date(archive.created_at).toLocaleString()}`);
      
      if (!archive.archived_data) {
        console.log('   ❌ ISSUE: No archived_data found');
        reportArchivesWithIssues++;
        continue;
      }
      
      const data = archive.archived_data;
      const issues = [];
      
      if (!data.shift_metrics) {
        issues.push('Missing shift_metrics');
      } else {
        const metrics = data.shift_metrics;
        const missingMetrics = [];
        
        if (!metrics.total_runtime && !metrics.runtime_minutes) missingMetrics.push('runtime');
        if (!metrics.total_downtime && !metrics.downtime_minutes) missingMetrics.push('downtime');
        if (!metrics.total_stops) missingMetrics.push('stops');
        if (!metrics.availability_percentage && !metrics.availability) missingMetrics.push('availability');
        
        if (missingMetrics.length > 0) {
          issues.push(`Incomplete metrics: missing ${missingMetrics.join(', ')}`);
        }
      }
      
      if (!data.asset_performance || data.asset_performance.length === 0) {
        issues.push('Missing or empty asset_performance');
      }
      
      if (!data.generation_metadata) {
        issues.push('Missing generation_metadata');
      } else {
        const meta = data.generation_metadata;
        if (!meta.events_processed) issues.push('Missing events_processed in metadata');
        if (!meta.assets_analyzed) issues.push('Missing assets_analyzed in metadata');
      }
      
      if (!data.reports || Object.keys(data.reports).length === 0) {
        issues.push('Missing or empty reports object');
      }
      
      if (issues.length > 0) {
        console.log(`   ❌ ISSUES: ${issues.join(', ')}`);
        reportArchivesWithIssues++;
      } else {
        console.log(`   ✅ Complete: All required data present`);
      }
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('=' .repeat(40));
    console.log(`Event archives with issues: ${eventArchivesWithIssues}/${eventArchives.length}`);
    console.log(`Report archives with issues: ${reportArchivesWithIssues}/${reportArchives.length}`);
    
    if (eventArchivesWithIssues > 0 || reportArchivesWithIssues > 0) {
      console.log('\n⚠️ DATA COMPLETENESS ISSUES DETECTED');
      
      if (eventArchivesWithIssues > 0) {
        console.log('- Event archives are missing critical data (events, shift info, or assets summary)');
      }
      
      if (reportArchivesWithIssues > 0) {
        console.log('- Report archives are missing metrics, asset performance, or generation metadata');
      }
    } else {
      console.log('\n✅ All analyzed archives appear to have complete data');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

// Run the analysis
if (require.main === module) {
  analyzeArchives().then(() => {
    console.log('\n✅ Analysis completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  });
}

module.exports = { analyzeArchives };