// Test natural language service directly
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src/backend/.env') });

const NaturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');
const Shift = require('./src/backend/models/shiftModel');

async function testNLService() {
    try {
        console.log('Testing Natural Language Service directly...');
        console.log('Environment check:');
        console.log('- OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
        console.log('- OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
        
        // Get a shift to test with
        const shift = await Shift.findOne({ where: { id: 74 } });
        if (!shift) {
            console.error('No shift found with ID 74');
            return;
        }
        
        console.log('\nFound shift:', shift.shift_name);
        
        // Test the service
        const nlService = new NaturalLanguageReportService();
        console.log('\nCalling generateShiftReport with useAI=true...');
        
        const result = await nlService.generateShiftReport(shift.id, {
            useAI: true,
            includeRawData: true
        });
        
        console.log('\nResult:');
        console.log('- Success:', result.success);
        console.log('- AI Used:', result.ai_used);
        console.log('- Report Type:', result.report_type);
        console.log('- Has narrative:', !!result.narrative);
        
        if (result.narrative) {
            console.log('- Executive summary length:', result.narrative.executive_summary ? result.narrative.executive_summary.length : 0);
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testNLService().then(() => {
    console.log('\nTest completed');
    process.exit(0);
}).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});