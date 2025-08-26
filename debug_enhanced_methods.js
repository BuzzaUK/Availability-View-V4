const path = require('path');
const reportService = require('./src/backend/services/reportService');
const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');
const dataInterpretationService = require('./src/backend/services/dataInterpretationService');

async function debugEnhancedMethods() {
    try {
        console.log('🔍 Debugging enhanced methods...');
        
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
        
        console.log('\n📋 Shift data before enhancement:');
        console.log('shift.id:', shiftData.shift.id);
        console.log('shift.shift_name:', shiftData.shift.shift_name);
        console.log('shift.name:', shiftData.shift.name);
        console.log('shift.start_time:', shiftData.shift.start_time);
        console.log('shift.end_time:', shiftData.shift.end_time);
        console.log('shift.duration_hours:', shiftData.shift.duration_hours);
        
        // Add advanced analysis
        console.log('\n🧠 Adding advanced analysis...');
        const advancedAnalysis = await dataInterpretationService.analyzeShiftData(shiftData, true);
        
        const enhancedShiftData = {
            ...shiftData,
            advancedAnalysis
        };
        
        console.log('\n📋 Enhanced shift data:');
        console.log('shift.id:', enhancedShiftData.shift.id);
        console.log('shift.shift_name:', enhancedShiftData.shift.shift_name);
        console.log('shift.name:', enhancedShiftData.shift.name);
        
        // Test enhanced methods directly
        console.log('\n🧪 Testing generateEnhancedExecutiveSummary...');
        const executiveSummary = naturalLanguageReportService.generateEnhancedExecutiveSummary(enhancedShiftData);
        console.log('Executive Summary Preview:', executiveSummary.substring(0, 200) + '...');
        
        console.log('\n🧪 Testing generateEnhancedShiftOverview...');
        const shiftOverview = naturalLanguageReportService.generateEnhancedShiftOverview(enhancedShiftData);
        console.log('Shift Overview Preview:', shiftOverview.substring(0, 200) + '...');
        
        // Test the full natural language report generation
        console.log('\n🧪 Testing full generateNaturalLanguageShiftReport...');
        const fullReport = await naturalLanguageReportService.generateNaturalLanguageShiftReport(76, { includeRawData: true });
        console.log('Full Report Success:', fullReport.success);
        console.log('Full Report Type:', fullReport.report_type);
        console.log('Full Executive Summary Preview:', fullReport.narrative.executive_summary.substring(0, 200) + '...');
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the debug
debugEnhancedMethods().then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
});