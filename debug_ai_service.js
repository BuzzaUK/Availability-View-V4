const path = require('path');
const reportService = require('./src/backend/services/reportService');
const aiNaturalLanguageService = require('./src/backend/services/aiNaturalLanguageService');
const dataInterpretationService = require('./src/backend/services/dataInterpretationService');

async function debugAIService() {
    try {
        console.log('🔍 Debugging AI service data flow...');
        
        // Generate shift report for shift 76
        console.log('\n📊 Generating shift report for shift 76...');
        const reportData = await reportService.generateShiftReport(76, { includeRawData: true });
        
        // Create the same data structure as the NL service
        const shiftData = {
            shift: reportData.shift,
            metrics: reportData.metrics,
            assets: reportData.assets,
            events: reportData.events || []
        };
        
        console.log('\n📋 Shift data before AI processing:');
        console.log('shift.id:', shiftData.shift.id);
        console.log('shift.shift_name:', shiftData.shift.shift_name);
        console.log('shift.name:', shiftData.shift.name);
        console.log('shift.start_time:', shiftData.shift.start_time);
        console.log('shift.end_time:', shiftData.shift.end_time);
        console.log('shift.duration_hours:', shiftData.shift.duration_hours);
        
        // Test the data interpretation service
        console.log('\n🧠 Testing data interpretation service...');
        const advancedAnalysis = await dataInterpretationService.analyzeShiftData(shiftData, true);
        
        const enhancedShiftData = {
            ...shiftData,
            advancedAnalysis
        };
        
        console.log('\n📋 Enhanced shift data:');
        console.log('shift.id:', enhancedShiftData.shift.id);
        console.log('shift.shift_name:', enhancedShiftData.shift.shift_name);
        console.log('shift.name:', enhancedShiftData.shift.name);
        
        // Test AI service methods directly
        console.log('\n🤖 Testing AI service generateIntelligentShiftReport...');
        const aiReport = await aiNaturalLanguageService.generateIntelligentShiftReport(enhancedShiftData, {});
        
        console.log('\n📊 AI Report Result:');
        console.log('Success:', aiReport.success);
        console.log('Shift ID:', aiReport.shift_id);
        console.log('Report Type:', aiReport.report_type);
        
        console.log('\n📝 AI Generated Narrative Previews:');
        console.log('Executive Summary Preview:', aiReport.narrative.executive_summary.substring(0, 100) + '...');
        console.log('Shift Overview Preview:', aiReport.narrative.shift_overview.substring(0, 100) + '...');
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the debug
debugAIService().then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
});