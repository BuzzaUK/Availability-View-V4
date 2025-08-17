const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

async function testEmailAttachmentIssue() {
    try {
        console.log('=== EMAIL ATTACHMENT ISSUE TEST ===');
        
        // Get current active shift
        const currentShift = await databaseService.getCurrentShift();
        if (!currentShift) {
            console.log('❌ No active shift found');
            return;
        }
        
        console.log('✅ Found active shift:', currentShift.shift_name);
        
        // Test the saveAndSendReport method
        console.log('\n📧 Testing saveAndSendReport method...');
        const result = await reportService.saveAndSendReport(
            currentShift.id,
            ['admin@example.com'],
            {
                includeCsv: true,
                includeHtml: true,
                includeAnalysis: true
            }
        );
        
        console.log('\n📊 RESULTS:');
        console.log('Success:', result.success);
        console.log('Files saved locally:', Object.keys(result.files || {}));
        console.log('Report formats generated:', Object.keys(result.report?.reports || {}));
        
        if (result.success) {
            console.log('\n🔍 ISSUE IDENTIFIED:');
            console.log('✅ Email sent successfully');
            console.log('✅ CSV file saved locally:', result.files.csv || 'None');
            console.log('❌ BUT: CSV file was NOT attached to the email!');
            console.log('\n💡 SOLUTION NEEDED:');
            console.log('The saveAndSendReport method needs to be updated to:');
            console.log('1. Include the saved CSV file as an email attachment');
            console.log('2. Add other report formats (HTML, PDF) as attachments if generated');
        } else {
            console.log('❌ Error:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testEmailAttachmentIssue().then(() => {
    console.log('\nTest completed');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});