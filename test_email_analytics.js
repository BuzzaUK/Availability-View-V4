const sendEmail = require('./src/backend/utils/sendEmail');
const analyticsSummaryService = require('./src/backend/services/analyticsSummaryService');
const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

async function testAnalyticsEmail() {
    console.log('🧪 Testing Enhanced Analytics Email System...');
    
    try {
        // Get recent archived data for analytics
        console.log('📊 Retrieving archived data for analytics...');
        const archivedData = await databaseService.getEventsForArchiving({
            limit: 100,
            includeAssets: true
        });
        
        if (!archivedData || archivedData.length === 0) {
            console.log('⚠️  No archived data found, creating mock data for testing...');
            // Create mock archived data for testing
            const mockArchivedData = [
                {
                    id: 1,
                    asset_id: 'TEST_ASSET_001',
                    event_type: 'stop',
                    state: 'stopped',
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                    duration: 1800, // 30 minutes
                    Asset: {
                        asset_name: 'Test Production Line A',
                        asset_type: 'production_line'
                    }
                },
                {
                    id: 2,
                    asset_id: 'TEST_ASSET_001',
                    event_type: 'start',
                    state: 'running',
                    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
                    duration: null,
                    Asset: {
                        asset_name: 'Test Production Line A',
                        asset_type: 'production_line'
                    }
                },
                {
                    id: 3,
                    asset_id: 'TEST_ASSET_002',
                    event_type: 'maintenance',
                    state: 'maintenance',
                    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
                    duration: 3600, // 1 hour
                    Asset: {
                        asset_name: 'Test Packaging Unit B',
                        asset_type: 'packaging_unit'
                    }
                }
            ];
            
            console.log('✅ Generated analytics from mock data');
            const analytics = await analyticsSummaryService.generateAnalyticsSummary(mockArchivedData, 'executive');
            
            // Generate enhanced filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `Test_Analytics_Report_${timestamp}.csv`;
            
            // Create mock report content
            const reportContent = 'Asset Name,Event Type,State,Timestamp,Duration\n' +
                mockArchivedData.map(event => 
                    `${event.Asset.asset_name},${event.event_type},${event.state},${event.timestamp.toISOString()},${event.duration || 'N/A'}`
                ).join('\n');
            
            // Generate email subject with analytics
            const emailSubject = await analyticsSummaryService.generateEmailSubjectLine(analytics);
            
            console.log('📧 Sending test email with analytics summary...');
            console.log('📋 Email Subject:', emailSubject);
            console.log('📊 Analytics Summary Preview:', typeof analytics === 'string' ? analytics.substring(0, 200) + '...' : JSON.stringify(analytics).substring(0, 200) + '...');
            
            // Send email with enhanced analytics
            await sendEmail({
                to: 'simon.test.user@example.com',
                subject: emailSubject,
                html: `
                    <h2>🎯 Enhanced Analytics Summary</h2>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        ${typeof analytics === 'string' ? analytics.replace(/\n/g, '<br>') : '<pre>' + JSON.stringify(analytics, null, 2) + '</pre>'}
                    </div>
                    <h3>📊 Shift Report Details</h3>
                    <p><strong>Report:</strong> ${filename}</p>
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Shift:</strong> Test Analytics Validation</p>
                `,
                text: `Enhanced Analytics Summary\n\n${typeof analytics === 'string' ? analytics : JSON.stringify(analytics, null, 2)}\n\nReport: ${filename}\nGenerated: ${new Date().toLocaleString()}`,
                attachments: [{
                    filename: filename,
                    content: typeof reportContent === 'string' ? reportContent : JSON.stringify(reportContent, null, 2),
                    contentType: 'text/csv'
                }]
            });
            
            console.log('✅ Test email sent successfully!');
            console.log('📬 Email sent to: simon.test.user@example.com');
            console.log('📄 Report filename:', filename);
            
        } else {
            console.log(`📊 Found ${archivedData.length} archived events for analytics`);
            
            // Generate analytics from real data
            const analytics = await analyticsSummaryService.generateAnalyticsSummary(archivedData, 'executive');
            
            // Get a recent shift for context
            const shifts = await databaseService.getAllShifts();
            const recentShift = shifts && shifts.length > 0 ? shifts[0] : {
                shift_name: 'Recent Operations',
                start_time: new Date(Date.now() - 8 * 60 * 60 * 1000),
                end_time: new Date()
            };
            
            // Generate enhanced filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const shiftName = recentShift.shift_name || 'Operations';
            const filename = `${shiftName.replace(/\s+/g, '_')}_Analytics_${timestamp}.csv`;
            
            // Generate report content
            let reportContent;
            try {
                const reportResult = await reportService.generateShiftReport(recentShift.id || 'mock');
                // Convert report to CSV string format
                if (reportResult && reportResult.reports && reportResult.reports.csv) {
                    reportContent = reportResult.reports.csv.shift_summary || reportResult.reports.csv;
                } else {
                    // Fallback to mock CSV content
                    reportContent = 'Asset Name,Event Type,State,Timestamp,Duration\n' +
                        'Real Production Line,operation,running,' + new Date().toISOString() + ',N/A';
                }
            } catch (reportError) {
                console.log('⚠️ Report generation failed, using mock data:', reportError.message);
                reportContent = 'Asset Name,Event Type,State,Timestamp,Duration\n' +
                    'Real Production Line,operation,running,' + new Date().toISOString() + ',N/A';
            }
            
            // Generate email subject with analytics
            const emailSubject = await analyticsSummaryService.generateEmailSubjectLine(analytics);
            
            console.log('📧 Sending email with real analytics data...');
            console.log('📋 Email Subject:', emailSubject);
            console.log('📊 Analytics Summary Preview:', typeof analytics === 'string' ? analytics.substring(0, 200) + '...' : JSON.stringify(analytics).substring(0, 200) + '...');
            
            // Send email with enhanced analytics
            await sendEmail({
                to: 'simon.test.user@example.com',
                subject: emailSubject,
                html: `
                    <h2>🎯 Enhanced Analytics Summary</h2>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        ${typeof analytics === 'string' ? analytics.replace(/\n/g, '<br>') : '<pre>' + JSON.stringify(analytics, null, 2) + '</pre>'}
                    </div>
                    <h3>📊 Shift Report Details</h3>
                    <p><strong>Report:</strong> ${filename}</p>
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Shift:</strong> ${recentShift.shift_name}</p>
                    <p><strong>Period:</strong> ${new Date(recentShift.start_time).toLocaleString()} - ${new Date(recentShift.end_time).toLocaleString()}</p>
                `,
                text: `Enhanced Analytics Summary\n\n${typeof analytics === 'string' ? analytics : JSON.stringify(analytics, null, 2)}\n\nReport: ${filename}\nGenerated: ${new Date().toLocaleString()}\nShift: ${recentShift.shift_name}`,
                attachments: [{
                     filename: filename,
                     content: typeof reportContent === 'string' ? reportContent : JSON.stringify(reportContent, null, 2),
                     contentType: 'text/csv'
                 }]
            });
            
            console.log('✅ Analytics email sent successfully!');
            console.log('📬 Email sent to: simon.test.user@example.com');
            console.log('📄 Report filename:', filename);
        }
        
        console.log('\n🎉 Enhanced Analytics Email Test Completed Successfully!');
        console.log('📧 Check your email for the analytics summary report.');
        console.log('📊 The email should contain:');
        console.log('   • Natural language analytics summary at the top');
        console.log('   • Enhanced subject line with key metrics');
        console.log('   • Improved filename with timestamp and shift info');
        console.log('   • Comprehensive shift report data');
        
    } catch (error) {
        console.error('❌ Error testing analytics email:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
testAnalyticsEmail();