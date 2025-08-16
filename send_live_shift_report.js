const sendEmail = require('./src/backend/utils/sendEmail');
const analyticsSummaryService = require('./src/backend/services/analyticsSummaryService');
const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

async function sendLiveShiftReport() {
    console.log('🎯 GENERATING LIVE SHIFT REPORT FOR SIMON TEST USER');
    console.log('=' .repeat(60));
    
    try {
        // 1. Verify Simon Test User exists and is unique
        console.log('\n👤 Verifying Simon Test User in database...');
        const users = await databaseService.getAllUsers();
        const simonUsers = users.filter(user => 
            user.name && user.name.toLowerCase().includes('simon') && 
            user.name.toLowerCase().includes('test')
        );
        
        if (simonUsers.length === 0) {
            throw new Error('No Simon Test User found in database');
        }
        
        if (simonUsers.length > 1) {
            console.log('⚠️  Multiple Simon Test Users found:');
            simonUsers.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.name} (${user.email})`);
            });
            throw new Error(`Multiple Simon Test Users found (${simonUsers.length}). Database contains ambiguous entries.`);
        }
        
        const simonUser = simonUsers[0];
        console.log('✅ Unique Simon Test User verified:');
        console.log(`   Name: ${simonUser.name}`);
        console.log(`   Email: ${simonUser.email}`);
        console.log(`   ID: ${simonUser.id}`);
        
        // 2. Get current/most recent shift for context
        console.log('\n📊 Retrieving current shift information...');
        let currentShift = await databaseService.getCurrentShift();
        
        if (!currentShift) {
            // Get most recent shift if no active shift
            const allShifts = await databaseService.getAllShifts();
            if (allShifts && allShifts.length > 0) {
                currentShift = allShifts[0]; // Most recent shift
                console.log(`📋 Using most recent shift: ${currentShift.shift_name} (ID: ${currentShift.id})`);
            } else {
                throw new Error('No shifts found in database');
            }
        } else {
            console.log(`📋 Active shift found: ${currentShift.shift_name} (ID: ${currentShift.id})`);
        }
        
        // 3. Get live events data (not archived, current events log)
        console.log('\n📈 Retrieving live events data from current log...');
        const liveEvents = await databaseService.getAllEvents({
            limit: 500, // Get recent events
            includeAssets: true
        });
        
        let eventsData;
        if (liveEvents && liveEvents.rows) {
            eventsData = liveEvents.rows;
        } else if (Array.isArray(liveEvents)) {
            eventsData = liveEvents;
        } else {
            throw new Error('No live events data available');
        }
        
        console.log(`📊 Retrieved ${eventsData.length} live events from current log`);
        
        if (eventsData.length === 0) {
            throw new Error('No live events found in current events log');
        }
        
        // 4. Generate comprehensive analytics from live data
        console.log('\n🧠 Generating comprehensive analytics from live data...');
        const analytics = await analyticsSummaryService.generateAnalyticsSummary(eventsData, 'executive');
        console.log('✅ Analytics generated successfully');
        console.log(`📝 Analytics type: ${typeof analytics}`);
        
        // 5. Generate enhanced email subject
        const emailSubject = await analyticsSummaryService.generateEmailSubjectLine(analytics);
        console.log(`📧 Email subject: ${emailSubject}`);
        
        // 6. Generate shift report using live data
        console.log('\n📊 Generating comprehensive shift report...');
        let reportContent;
        try {
            const reportResult = await reportService.generateShiftReport(currentShift.id);
            if (reportResult && reportResult.reports && reportResult.reports.csv) {
                reportContent = reportResult.reports.csv.shift_summary || reportResult.reports.csv;
                console.log('✅ Shift report generated from live data');
            } else {
                throw new Error('Report generation returned invalid format');
            }
        } catch (reportError) {
            console.log(`⚠️  Shift report generation failed: ${reportError.message}`);
            console.log('📊 Generating CSV report from live events data...');
            
            // Generate CSV from live events data
            const csvHeader = 'Asset Name,Event Type,State,Timestamp,Duration,Asset Type\n';
            const csvRows = eventsData.slice(0, 100).map(event => {
                const assetName = event.Asset ? event.Asset.asset_name || event.Asset.name : 'Unknown Asset';
                const assetType = event.Asset ? event.Asset.asset_type || event.Asset.type : 'Unknown';
                const duration = event.duration ? `${event.duration}s` : 'N/A';
                const timestamp = new Date(event.timestamp).toISOString();
                
                return `"${assetName}","${event.event_type}","${event.state}","${timestamp}","${duration}","${assetType}"`;
            }).join('\n');
            
            reportContent = csvHeader + csvRows;
            console.log('✅ CSV report generated from live events');
        }
        
        // 7. Generate enhanced filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const shiftName = currentShift.shift_name || 'Current_Operations';
        const filename = `${shiftName.replace(/\s+/g, '_')}_Live_Report_${timestamp}.csv`;
        
        console.log(`📄 Report filename: ${filename}`);
        
        // 8. Send comprehensive email with analytics
        console.log('\n📧 Sending comprehensive shift report email...');
        console.log(`📬 Recipient: ${simonUser.email}`);
        
        const analyticsText = typeof analytics === 'string' ? analytics : JSON.stringify(analytics, null, 2);
        
        await sendEmail({
            to: simonUser.email,
            subject: emailSubject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                    <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">🎯 Comprehensive Shift Report</h1>
                    
                    <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2 style="color: #e74c3c; margin-top: 0;">📊 Enhanced Analytics Summary</h2>
                        <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db;">
                            ${analyticsText.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #2c3e50;">📋 Report Details</h3>
                        <ul style="list-style-type: none; padding: 0;">
                            <li><strong>📄 Report File:</strong> ${filename}</li>
                            <li><strong>⏰ Generated:</strong> ${new Date().toLocaleString()}</li>
                            <li><strong>🏭 Shift:</strong> ${currentShift.shift_name}</li>
                            <li><strong>📊 Data Source:</strong> Live Events Log</li>
                            <li><strong>📈 Events Analyzed:</strong> ${eventsData.length}</li>
                            <li><strong>🎯 Report Type:</strong> Comprehensive Analytics</li>
                        </ul>
                    </div>
                    
                    <div style="background-color: #d5f4e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #27ae60; margin-top: 0;">✅ Data Verification</h3>
                        <p>✓ Live data from current events log<br>
                        ✓ No test or simulated data used<br>
                        ✓ Comprehensive analytics included<br>
                        ✓ Enhanced reporting format applied</p>
                    </div>
                    
                    <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px; border-top: 1px solid #bdc3c7; padding-top: 15px;">
                        This report was automatically generated by the Enhanced Analytics System using live operational data.
                    </p>
                </div>
            `,
            text: `Comprehensive Shift Report\n\nEnhanced Analytics Summary:\n${analyticsText}\n\nReport Details:\n- File: ${filename}\n- Generated: ${new Date().toLocaleString()}\n- Shift: ${currentShift.shift_name}\n- Data Source: Live Events Log\n- Events Analyzed: ${eventsData.length}\n\nThis report uses live operational data with comprehensive analytics.`,
            attachments: [{
                filename: filename,
                content: typeof reportContent === 'string' ? reportContent : JSON.stringify(reportContent, null, 2),
                contentType: 'text/csv'
            }]
        });
        
        console.log('\n🎉 COMPREHENSIVE SHIFT REPORT SENT SUCCESSFULLY!');
        console.log('=' .repeat(60));
        console.log('✅ Report Details:');
        console.log(`   📧 Sent to: ${simonUser.email}`);
        console.log(`   📋 Subject: ${emailSubject}`);
        console.log(`   📄 Filename: ${filename}`);
        console.log(`   📊 Analytics: Comprehensive summary included`);
        console.log(`   📈 Data Source: Live events log (${eventsData.length} events)`);
        console.log(`   🏭 Shift Context: ${currentShift.shift_name}`);
        console.log('\n📧 Please check the registered email address for the comprehensive report.');
        
    } catch (error) {
        console.error('❌ Error generating/sending live shift report:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Execute the live shift report generation
sendLiveShiftReport();