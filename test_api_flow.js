// Set environment and disable logging
process.env.NODE_ENV = 'development';
const originalLog = console.log;
console.log = () => {};

// Restore console.log
console.log = originalLog;

async function testApiFlow() {
  console.log('🔍 Testing exact API flow...');
  
  try {
    // Step 1: Import reportService exactly like the controller does
    console.log('\n📋 Step 1: Import reportService (like controller)');
    const reportService = require('./src/backend/services/reportService');
    
    // Step 2: Call getArchivedShiftReports with empty options (like API does)
    console.log('\n📋 Step 2: Call getArchivedShiftReports with empty options');
    const options = {};
    const shiftReportArchives = await reportService.getArchivedShiftReports(options);
    console.log('Found archives:', shiftReportArchives.length);
    
    if (shiftReportArchives.length > 0) {
      console.log('First archive:', {
        id: shiftReportArchives[0].id,
        title: shiftReportArchives[0].title,
        archive_type: shiftReportArchives[0].archive_type,
        hasArchivedData: !!shiftReportArchives[0].archived_data
      });
    }
    
    // Step 3: Apply search filter (empty search)
    console.log('\n📋 Step 3: Apply search filter (empty)');
    const search = '';
    let filteredArchives = shiftReportArchives;
    if (search) {
      filteredArchives = shiftReportArchives.filter(archive => 
        archive.title.toLowerCase().includes(search.toLowerCase()) ||
        (archive.description && archive.description.toLowerCase().includes(search.toLowerCase()))
      );
    }
    console.log('After search filter:', filteredArchives.length);
    
    // Step 4: Apply pagination
    console.log('\n📋 Step 4: Apply pagination (page=1, limit=10)');
    const page = 1;
    const limit = 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedReports = filteredArchives.slice(startIndex, endIndex);
    console.log('After pagination:', paginatedReports.length);
    
    // Step 5: Transform data (simplified)
    console.log('\n📋 Step 5: Transform data');
    const transformedReports = paginatedReports.map(archive => {
      const archivedData = archive.archived_data || {};
      return {
        id: archive.id,
        title: archive.title,
        hasData: Object.keys(archivedData).length > 0
      };
    });
    console.log('Transformed reports:', transformedReports.length);
    
    // Step 6: Final response structure
    console.log('\n📋 Step 6: Final response structure');
    const response = {
      success: true,
      data: transformedReports,
      total: filteredArchives.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(filteredArchives.length / limit)
    };
    
    console.log('\n📊 FINAL RESULT:');
    console.log('Success:', response.success);
    console.log('Data count:', response.data.length);
    console.log('Total:', response.total);
    console.log('Page:', response.page);
    console.log('Limit:', response.limit);
    
  } catch (error) {
    console.error('❌ Error in API flow test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testApiFlow().then(() => {
  console.log('\n✅ API flow test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ API flow test failed:', error);
  process.exit(1);
});