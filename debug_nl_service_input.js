const path = require('path');
const { Sequelize } = require('sequelize');

// Import the actual services
const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

async function debugNaturalLanguageServiceInput() {
    try {
        console.log('🔍 Debugging natural language service input data...');
        
        // Database service initializes automatically
        console.log('✅ Database service ready');
        
        // Generate shift report for shift 76
        console.log('\n📊 Generating shift report for shift 76...');
        const reportData = await reportService.generateShiftReport(76, { includeRawData: true });
        
        console.log('\n🔍 Report data structure:');
        console.log('Keys:', Object.keys(reportData));
        
        console.log('\n📋 Shift data passed to natural language service:');
        console.log('shift keys:', Object.keys(reportData.shift));
        console.log('shift.id:', reportData.shift.id);
        console.log('shift.shift_name:', reportData.shift.shift_name);
        console.log('shift.name:', reportData.shift.name);
        console.log('shift.start_time:', reportData.shift.start_time);
        console.log('shift.end_time:', reportData.shift.end_time);
        console.log('shift.duration_hours:', reportData.shift.duration_hours);
        
        console.log('\n📊 Metrics data:');
        console.log('metrics keys:', Object.keys(reportData.metrics));
        console.log('availability_percentage:', reportData.metrics.availability_percentage);
        
        console.log('\n🏭 Assets data:');
        console.log('assets count:', reportData.assets.length);
        if (reportData.assets.length > 0) {
            console.log('first asset keys:', Object.keys(reportData.assets[0]));
        }
        
        console.log('\n📝 Events data:');
        console.log('events count:', reportData.events ? reportData.events.length : 'undefined');
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the debug
debugNaturalLanguageServiceInput().then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
});