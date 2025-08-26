const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');

async function testNLReportContent() {
  try {
    console.log('Testing Natural Language Report Content for Shift 74...');
    
    const service = naturalLanguageReportService;
    const result = await service.generateNaturalLanguageShiftReport(74, {
      includeRawData: true,
      useAI: false // Use fallback generation to avoid AI issues
    });
    
    console.log('\n=== REPORT GENERATION RESULT ===');
    console.log('Success:', result.success);
    console.log('Shift ID:', result.shift_id);
    console.log('Report Type:', result.report_type);
    
    if (result.narrative) {
      console.log('\n=== NARRATIVE SECTIONS ===');
      const sections = Object.keys(result.narrative);
      console.log('Available sections:', sections);
      
      sections.forEach(section => {
        const content = result.narrative[section];
        if (content) {
          console.log(`\n--- ${section.toUpperCase()} ---`);
          console.log(`Length: ${content.length} characters`);
          console.log(`Preview: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
        } else {
          console.log(`\n--- ${section.toUpperCase()} ---`);
          console.log('Content: NULL or EMPTY');
        }
      });
    } else {
      console.log('\n❌ NO NARRATIVE FOUND');
    }
    
    if (result.raw_data) {
      console.log('\n=== RAW DATA SUMMARY ===');
      console.log('Shift:', result.raw_data.shift ? 'Present' : 'Missing');
      console.log('Metrics:', result.raw_data.metrics ? 'Present' : 'Missing');
      console.log('Assets:', result.raw_data.assets ? `${result.raw_data.assets.length} assets` : 'Missing');
      console.log('Events:', result.raw_data.events ? `${result.raw_data.events.length} events` : 'Missing');
    }
    
  } catch (error) {
    console.error('❌ Error testing NL report content:', error.message);
    console.error('Stack:', error.stack);
  }
}

testNLReportContent();