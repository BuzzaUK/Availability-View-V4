const databaseService = require('./src/backend/services/databaseService');
const sendEmail = require('./src/backend/utils/sendEmail');
const reportService = require('./src/backend/services/reportService');
const fs = require('fs');
const path = require('path');

async function sendCurrentShiftReport() {
    console.log('📧 GENERATING CURRENT SHIFT REPORT WITH ANALYTICS');
    console.log('=' .repeat(55));
    
    try {
        // Find Simon Test User
        console.log('\n🔍 Finding Simon Test User...');
        const users = await databaseService.getAllUsers();
        const simonUser = users.find(user => 
            user.name.toLowerCase().includes('simon') && 
            user.name.toLowerCase().includes('test')
        );
        
        if (!simonUser) {
            throw new Error('Simon Test User not found in database');
        }
        
        console.log(`✅ Found user: ${simonUser.name} (${simonUser.email})`);
        
        // Get current shift information
        console.log('\n📊 Retrieving current shift information...');
        const currentShift = await databaseService.getCurrentShift();
        
        if (!currentShift) {
            console.log('⚠️  No active shift found, using default shift data');
        } else {
            console.log(`✅ Current shift: ${currentShift.name} (ID: ${currentShift.id})`);
        }
        
        // Get current events from the Events table
        console.log('\n📋 Retrieving current events data...');
        const eventsResult = await databaseService.getAllEvents();
        const events = eventsResult?.rows || eventsResult || [];
        
        console.log(`✅ Retrieved ${events.length} events from Events table`);
        
        if (events.length === 0) {
            console.log('⚠️  No events found in Events table');
            return;
        }
        
        // Generate analytics from current events
        console.log('\n📈 Generating analytics from current events...');
        
        const analytics = {
            totalEvents: events.length,
            eventsByType: {},
            eventsByLogger: {},
            recentEvents: events.slice(-10), // Last 10 events
            timeRange: {
                earliest: events.length > 0 ? new Date(Math.min(...events.map(e => new Date(e.timestamp)))) : null,
                latest: events.length > 0 ? new Date(Math.max(...events.map(e => new Date(e.timestamp)))) : null
            }
        };
        
        // Count events by type
        events.forEach(event => {
            const eventType = event.event_type || 'Unknown';
            analytics.eventsByType[eventType] = (analytics.eventsByType[eventType] || 0) + 1;
        });
        
        // Count events by logger
        events.forEach(event => {
            const loggerId = event.logger_id || 'Unknown';
            analytics.eventsByLogger[loggerId] = (analytics.eventsByLogger[loggerId] || 0) + 1;
        });
        
        console.log(`✅ Analytics generated:`);
        console.log(`   - Total Events: ${analytics.totalEvents}`);
        console.log(`   - Event Types: ${Object.keys(analytics.eventsByType).length}`);
        console.log(`   - Active Loggers: ${Object.keys(analytics.eventsByLogger).length}`);
        
        // Generate natural language analytics summary
        const analyticsText = generateAnalyticsSummary(analytics);
        
        // Generate email subject based on analytics
        const subject = generateEmailSubject(analytics, currentShift);
        
        console.log(`\n📧 Email subject: ${subject}`);
        
        // Create CSV report from current events
        console.log('\n📄 Creating CSV report from current events...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const shiftName = currentShift ? currentShift.name : 'Current';
        const reportFileName = `Current_Events_Report_${timestamp}.csv`;
        const reportPath = path.join(__dirname, 'reports', reportFileName);
        
        // Ensure reports directory exists
        const reportsDir = path.join(__dirname, 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        // Generate CSV content
        let csvContent = 'ID,Timestamp,Logger ID,Event Type,Data,Created At\n';
        events.forEach(event => {
            const row = [
                event.id || '',
                event.timestamp || '',
                event.logger_id || '',
                event.event_type || '',
                JSON.stringify(event.data || '').replace(/"/g, '""'),
                event.created_at || ''
            ].join(',');
            csvContent += row + '\n';
        });
        
        // Write CSV file
        fs.writeFileSync(reportPath, csvContent);
        console.log(`✅ CSV report created: ${reportFileName}`);
        
        // Send email with analytics and report
        console.log('\n📧 Sending email with analytics and report...');
        
        const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">📊 Current Events Analytics Report</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Generated on ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #28a745;">
                <h2 style="color: #28a745; margin-top: 0;">📈 Analytics Summary</h2>
                <div style="background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${analyticsText}
                </div>
            </div>
            
            <div style="padding: 20px; background: white;">
                <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">📋 Event Breakdown</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                        <h4 style="color: #1976d2; margin-top: 0;">📊 Events by Type</h4>
                        ${Object.entries(analytics.eventsByType).map(([type, count]) => 
                            `<div style="margin: 5px 0;"><strong>${type}:</strong> ${count} events</div>`
                        ).join('')}
                    </div>
                    
                    <div style="background: #f3e5f5; padding: 15px; border-radius: 8px;">
                        <h4 style="color: #7b1fa2; margin-top: 0;">🔧 Events by Logger</h4>
                        ${Object.entries(analytics.eventsByLogger).map(([logger, count]) => 
                            `<div style="margin: 5px 0;"><strong>${logger}:</strong> ${count} events</div>`
                        ).join('')}
                    </div>
                </div>
                
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #f57c00; margin-top: 0;">⏰ Time Range</h4>
                    <p><strong>Earliest Event:</strong> ${analytics.timeRange.earliest ? analytics.timeRange.earliest.toLocaleString() : 'N/A'}</p>
                    <p><strong>Latest Event:</strong> ${analytics.timeRange.latest ? analytics.timeRange.latest.toLocaleString() : 'N/A'}</p>
                </div>
            </div>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
                <p style="margin: 0; color: #2e7d32;">📎 <strong>Detailed CSV report attached</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Report contains all ${analytics.totalEvents} current events with full details</p>
            </div>
        </div>
        `;
        
        const emailResult = await sendEmail({
            to: simonUser.email,
            subject: subject,
            html: emailContent,
            attachments: [{
                filename: reportFileName,
                path: reportPath
            }]
        });
        
        if (emailResult.success) {
            console.log(`\n✅ EMAIL SENT SUCCESSFULLY!`);
            console.log(`   📧 To: ${simonUser.email}`);
            console.log(`   📋 Subject: ${subject}`);
            console.log(`   📎 Attachment: ${reportFileName}`);
            console.log(`   📊 Events Analyzed: ${analytics.totalEvents}`);
        } else {
            console.log(`\n❌ Email sending failed: ${emailResult.error}`);
        }
        
        console.log('\n' + '=' .repeat(55));
        console.log('📧 CURRENT SHIFT REPORT GENERATION COMPLETE');
        
    } catch (error) {
        console.error('❌ Error generating current shift report:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

function generateAnalyticsSummary(analytics) {
    const { totalEvents, eventsByType, eventsByLogger } = analytics;
    
    if (totalEvents === 0) {
        return '<p style="color: #666;">No events found in the current period.</p>';
    }
    
    const mostCommonType = Object.entries(eventsByType).sort((a, b) => b[1] - a[1])[0];
    const mostActiveLogger = Object.entries(eventsByLogger).sort((a, b) => b[1] - a[1])[0];
    
    let summary = `<p><strong>📊 Total Events Processed:</strong> ${totalEvents}</p>`;
    
    if (mostCommonType) {
        summary += `<p><strong>🔥 Most Common Event Type:</strong> ${mostCommonType[0]} (${mostCommonType[1]} occurrences)</p>`;
    }
    
    if (mostActiveLogger) {
        summary += `<p><strong>⚡ Most Active Logger:</strong> ${mostActiveLogger[0]} (${mostActiveLogger[1]} events)</p>`;
    }
    
    // Performance assessment
    const eventsPerType = Object.keys(eventsByType).length;
    const eventsPerLogger = Object.keys(eventsByLogger).length;
    
    if (totalEvents > 50) {
        summary += '<p style="color: #28a745;"><strong>✅ System Activity:</strong> High activity detected - system is actively logging events</p>';
    } else if (totalEvents > 20) {
        summary += '<p style="color: #ffc107;"><strong>⚠️ System Activity:</strong> Moderate activity - normal operational levels</p>';
    } else {
        summary += '<p style="color: #dc3545;"><strong>🔍 System Activity:</strong> Low activity - may require attention</p>';
    }
    
    return summary;
}

function generateEmailSubject(analytics, currentShift) {
    const { totalEvents } = analytics;
    const shiftName = currentShift ? currentShift.name : 'Current Period';
    
    if (totalEvents === 0) {
        return `⚠️ No Events Detected - ${shiftName} Report`;
    } else if (totalEvents > 50) {
        return `✅ High Activity Report - ${shiftName} (${totalEvents} Events)`;
    } else if (totalEvents > 20) {
        return `📊 Standard Activity Report - ${shiftName} (${totalEvents} Events)`;
    } else {
        return `🔍 Low Activity Alert - ${shiftName} (${totalEvents} Events)`;
    }
}

// Execute the report generation
sendCurrentShiftReport();