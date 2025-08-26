const path = require('path');
const reportService = require('./src/backend/services/reportService');
const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');

async function debugNaturalLanguageMethods() {
    try {
        console.log('🔍 Debugging natural language service methods...');
        
        // Generate shift report for shift 76
        console.log('\n📊 Generating shift report for shift 76...');
        const reportData = await reportService.generateShiftReport(76, { includeRawData: true });
        
        console.log('\n🔍 Testing individual NL service methods:');
        
        // Create the same data structure as the NL service
        const shiftData = {
            shift: reportData.shift,
            metrics: reportData.metrics,
            assets: reportData.assets,
            events: reportData.events || []
        };
        
        console.log('\n📋 Shift data for NL methods:');
        console.log('shift.id:', shiftData.shift.id);
        console.log('shift.shift_name:', shiftData.shift.shift_name);
        console.log('shift.start_time:', shiftData.shift.start_time);
        console.log('shift.end_time:', shiftData.shift.end_time);
        
        // Test the executive summary method directly
        console.log('\n🧪 Testing generateEnhancedExecutiveSummary...');
        try {
            const executiveSummary = naturalLanguageReportService.generateEnhancedExecutiveSummary(shiftData);
            console.log('Executive Summary Preview:', executiveSummary.substring(0, 200) + '...');
        } catch (error) {
            console.error('❌ Error in generateEnhancedExecutiveSummary:', error.message);
        }
        
        // Test the shift overview method directly
        console.log('\n🧪 Testing generateEnhancedShiftOverview...');
        try {
            const shiftOverview = naturalLanguageReportService.generateEnhancedShiftOverview(shiftData);
            console.log('Shift Overview Preview:', shiftOverview.substring(0, 200) + '...');
        } catch (error) {
            console.error('❌ Error in generateEnhancedShiftOverview:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the debug
debugNaturalLanguageMethods().then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
});