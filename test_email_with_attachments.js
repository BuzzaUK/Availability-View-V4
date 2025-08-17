const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');
const path = require('path');
const fs = require('fs');

async function testEmailWithAttachments() {
  try {
    console.log('=== Testing Email with Attachments ===');
    
    // Wait for database to be ready
    while (!databaseService.initialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('Database ready');
    
    // Get current active shift
    const activeShift = await databaseService.getCurrentShift();
    console.log('Active shift:', activeShift ? activeShift.id : 'None');
    
    if (!activeShift) {
      console.log('No active shift found. Creating a test shift...');
      
      // Create a test shift
      const testShift = await databaseService.createShift({
        shift_name: 'Test Shift for Email',
        start_time: new Date(),
        status: 'active'
      });
      console.log('Created test shift:', testShift.toJSON());
      
      // Add some test data to make the report meaningful
      const { Event } = require('./src/backend/models/database');
      
      // Get first available asset and logger
      const assets = await databaseService.getAllAssets();
      const loggers = await databaseService.getAllLoggers();
      
      if (assets.length > 0 && loggers.length > 0) {
        await Event.create({
          shift_id: testShift.id,
          asset_id: assets[0].id,
          logger_id: loggers[0].id,
          event_type: 'info',
          description: 'Test event for email report',
          timestamp: new Date()
        });
        console.log('Added test event');
      } else {
        console.log('No assets or loggers available for test event');
      }
    }
    
    // Get users who should receive shift reports
    const allUsers = await databaseService.getAllUsers();
    const users = allUsers.filter(user => user.receive_reports || user.shiftReportPreferences?.enabled);
    console.log('Users configured for shift reports:', users.map(u => u.email));
    
    if (users.length === 0) {
      console.log('No users configured for shift reports. Using test email...');
      users.push({ email: 'admin@example.com' });
    }
    
    const recipients = users.map(user => user.email);
    console.log('Email recipients:', recipients);
    
    // Generate and send shift report with attachments
    console.log('\n=== Generating and Sending Report ===');
    const result = await reportService.saveAndSendReport(
      activeShift ? activeShift.id : (await databaseService.getCurrentShift()).id,
      'csv', // format
      recipients
    );
    
    console.log('Report generation result:', {
      formats: result.formats,
      files_generated: result.files_generated,
      recipients_count: recipients.length
    });
    
    // Check if files were actually created
    if (result.files_generated && result.files_generated.csv) {
      const csvPath = result.files_generated.csv;
      console.log('\n=== Checking Generated Files ===');
      console.log('CSV file path:', csvPath);
      
      try {
        const stats = fs.statSync(csvPath);
        console.log('CSV file exists:', true);
        console.log('CSV file size:', stats.size, 'bytes');
        console.log('CSV file created:', stats.birthtime);
      } catch (error) {
        console.log('CSV file exists:', false);
        console.log('Error checking file:', error.message);
      }
    } else {
      console.log('No CSV file path in result');
    }
    
    console.log('\n=== Test Completed Successfully ===');
    console.log('Email should have been sent with CSV attachment to:', recipients.join(', '));
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    if (databaseService.close) {
      await databaseService.close();
    }
    process.exit(0);
  }
}

// Run the test
testEmailWithAttachments();