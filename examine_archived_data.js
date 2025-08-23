const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

async function examineArchivedData() {
  try {
    console.log('🔍 Examining archived shift report data structure...');
    
    // Get the first archived shift report
    const archivedReports = await reportService.getArchivedShiftReports();
    
    if (archivedReports.length === 0) {
      console.log('❌ No archived shift reports found');
      return;
    }
    
    const firstReport = archivedReports[0];
    console.log('📊 Archive found:', {
      id: firstReport.id,
      title: firstReport.title,
      date_range_start: firstReport.date_range_start,
      date_range_end: firstReport.date_range_end
    });
    
    const archivedData = firstReport.archived_data;
    
    if (archivedData) {
      console.log('\n📋 Root keys:', Object.keys(archivedData));
      
      // Check key fields needed by reportController
      console.log('\n🔍 Key fields for reportController:');
      console.log('- duration:', archivedData.duration || 'NOT FOUND');
      console.log('- description:', archivedData.description || 'NOT FOUND');
      console.log('- start_time:', archivedData.start_time || 'NOT FOUND');
      console.log('- end_time:', archivedData.end_time || 'NOT FOUND');
      
      // Check shift_metrics
      if (archivedData.shift_metrics) {
        console.log('\n🎯 shift_metrics found:', Object.keys(archivedData.shift_metrics));
        console.log('shift_metrics values:', archivedData.shift_metrics);
      }
      
      // Check generation_metadata
      if (archivedData.generation_metadata) {
        console.log('\n📊 generation_metadata found:', Object.keys(archivedData.generation_metadata));
        console.log('- shift_duration_ms:', archivedData.generation_metadata.shift_duration_ms);
      }
      
      // Check if we have archive-level fields that could be used
      console.log('\n🏛️ Archive-level fields:');
      console.log('- archive.title:', firstReport.title);
      console.log('- archive.description:', firstReport.description);
      console.log('- archive.date_range_start:', firstReport.date_range_start);
      console.log('- archive.date_range_end:', firstReport.date_range_end);
      
    } else {
      console.log('❌ No archived_data found');
    }
    
  } catch (error) {
    console.error('❌ Error examining archived data:', error.message);
  }
}

examineArchivedData();