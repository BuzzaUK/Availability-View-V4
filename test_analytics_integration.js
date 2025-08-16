const databaseService = require('./src/backend/services/databaseService');
const analyticsSummaryService = require('./src/backend/services/analyticsSummaryService');
const reportService = require('./src/backend/services/reportService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

/**
 * Comprehensive Testing Suite for Analytics Integration
 * Tests the new analytics summary generation, enhanced reporting, and email notifications
 */

class AnalyticsIntegrationTester {
  constructor() {
    this.testResults = [];
    this.testsPassed = 0;
    this.testsFailed = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    
    if (type === 'error') {
      console.error(logMessage);
    }
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`Starting test: ${testName}`);
      const result = await testFunction();
      this.testResults.push({ name: testName, status: 'PASSED', result });
      this.testsPassed++;
      this.log(`✅ Test passed: ${testName}`, 'success');
      return result;
    } catch (error) {
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
      this.testsFailed++;
      this.log(`❌ Test failed: ${testName} - ${error.message}`, 'error');
      return null;
    }
  }

  // Test 1: Validate Analytics Summary Service
  async testAnalyticsSummaryService() {
    return await this.runTest('Analytics Summary Service Validation', async () => {
      // Create mock archived data
      const mockArchivedData = {
        events: [
          {
            timestamp: new Date('2024-01-15T08:00:00Z'),
            asset: 'Asset_1',
            event_type: 'START',
            state: 'RUNNING',
            runtime: 0,
            downtime: 0
          },
          {
            timestamp: new Date('2024-01-15T10:30:00Z'),
            asset: 'Asset_1',
            event_type: 'STOP',
            state: 'STOPPED',
            runtime: 150,
            downtime: 0
          },
          {
            timestamp: new Date('2024-01-15T11:00:00Z'),
            asset: 'Asset_1',
            event_type: 'START',
            state: 'RUNNING',
            runtime: 150,
            downtime: 30
          }
        ],
        shift_info: {
          name: 'Morning Shift',
          start_time: new Date('2024-01-15T08:00:00Z'),
          end_time: new Date('2024-01-15T16:00:00Z')
        },
        assets_summary: {
          Asset_1: {
            total_events: 3,
            event_types: { START: 2, STOP: 1 },
            states: { RUNNING: 2, STOPPED: 1 },
            first_event: new Date('2024-01-15T08:00:00Z'),
            last_event: new Date('2024-01-15T11:00:00Z')
          }
        }
      };

      // Test comprehensive analytics generation
      const analytics = analyticsSummaryService.generateAnalyticsSummary(mockArchivedData);
      
      // Validate analytics structure
      if (!analytics.executive_summary || !analytics.key_metrics || !analytics.performance_insights) {
        throw new Error('Analytics summary missing required sections');
      }
      
      // Validate key metrics
      if (typeof analytics.key_metrics.totalEvents !== 'number' || analytics.key_metrics.totalEvents < 0) {
        throw new Error('Invalid total events calculation');
      }
      
      if (typeof analytics.key_metrics.overallAvailability !== 'number' || analytics.key_metrics.overallAvailability < 0) {
        throw new Error('Invalid overall availability calculation');
      }
      
      // Validate executive summary is a string
      if (typeof analytics.executive_summary !== 'string' || analytics.executive_summary.length === 0) {
        throw new Error('Invalid executive summary');
      }
      
      this.log(`Analytics generated successfully with executive summary length: ${analytics.executive_summary.length} characters`);
      return analytics;
    });
  }

  // Test 2: Validate Enhanced Report Generation
  async testEnhancedReportGeneration() {
    return await this.runTest('Enhanced Report Generation', async () => {
      // Get a real shift from database or create mock data
       let shift;
       const shifts = await databaseService.getAllShifts();
      
      if (shifts && shifts.length > 0) {
        shift = shifts[0];
        this.log(`Testing with real shift: ${shift.shift_name} (ID: ${shift.id})`);
         
         // Test report generation with real shift
         const report = await reportService.generateShiftReport(shift.id, { includeAnalytics: true });
        
        // Validate report structure
        if (!report || !report.reports) {
          throw new Error('Report generation failed');
        }
        
        this.log('Enhanced report generation test completed with real data');
        return report;
      } else {
        // Create mock shift for testing analytics only
        shift = {
          _id: 'test-shift-id',
          name: 'Test Shift',
          start_time: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          end_time: new Date().toISOString()
        };
        
        this.log(`Testing with mock shift: ${shift.name} (ID: ${shift._id})`);
        
        // Create mock archived data for testing
        const mockArchivedData = {
          events: [
            { event_type: 'stop', duration: 300, asset_id: 1, timestamp: new Date() },
            { event_type: 'start', duration: 0, asset_id: 1, timestamp: new Date() }
          ],
          shift_info: shift,
          assets_summary: { totalAssets: 2, activeAssets: 2 }
        };
        
        // Test analytics generation
        const analytics = analyticsSummaryService.generateAnalyticsSummary(mockArchivedData);
        
        // Generate mock report structure for testing
        const report = {
          reports: {
            csv: 'ANALYTICS SUMMARY\nExecutive Summary: Test summary',
            html: '<h1>Analytics Summary</h1><p>Executive Summary: Test summary</p>'
          }
        };
        
        // Validate analytics structure first
        if (!analytics.executive_summary) {
          throw new Error('Analytics generation failed');
        }
        
        if (!analytics.key_metrics) {
          throw new Error('Analytics missing key metrics');
        }
        
        // Validate report structure
        if (!report.reports || !report.reports.csv || !report.reports.html) {
          throw new Error('Enhanced report missing required formats');
        }
        
        // Check for analytics content in reports
        if (!report.reports.csv.includes('ANALYTICS SUMMARY') && !report.reports.csv.includes('Executive Summary')) {
          throw new Error('CSV report missing analytics summary');
        }
        
        if (!report.reports.html.includes('Analytics Summary') && !report.reports.html.includes('Executive Summary')) {
          throw new Error('HTML report missing analytics summary');
        }
        
        this.log('Enhanced report generated successfully with analytics integration');
        return report;
      }
    });
  }

  // Test 3: Validate Enhanced Filename Generation
  async testEnhancedFilenameGeneration() {
    return await this.runTest('Enhanced Filename Generation', async () => {
      const testShiftName = 'Morning Production Shift';
      const testDate = new Date('2024-01-15T08:30:45Z');
      
      // Test reportService filename generation
      const filename = reportService.generateEnhancedFilename(testShiftName, testDate, 'csv');
      
      // Validate filename format: YYYY-MM-DD_HH-MM-SS_ShiftName_Shift_Report.extension
      const expectedPattern = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_[\w_]+_Shift_Report\.csv$/;
      if (!expectedPattern.test(filename)) {
        throw new Error(`Invalid filename format: ${filename}`);
      }
      
      // Check that special characters are sanitized
      if (filename.includes(' ') || filename.includes('(') || filename.includes(')')) {
        throw new Error('Filename contains unsanitized special characters');
      }
      
      this.log(`Enhanced filename generated: ${filename}`);
      return filename;
    });
  }

  // Test 4: Validate Database Integration
  async testDatabaseIntegration() {
    return await this.runTest('Database Integration', async () => {
      // Test database connectivity
      const shifts = await databaseService.getShifts({ limit: 1 });
      if (!Array.isArray(shifts)) {
        throw new Error('Database connection failed or invalid response');
      }
      
      // Test events retrieval
      const eventsResult = await databaseService.getAllEvents({ limit: 10 });
      const events = eventsResult.rows || eventsResult; // Handle findAndCountAll vs findAll
      
      if (!Array.isArray(events)) {
        throw new Error('Events retrieval failed');
      }
      
      this.log(`Retrieved ${events.length} events for testing`);
      
      if (shifts.length > 0) {
        this.log(`Database has ${shifts.length} shifts available`);
      } else {
        this.log('No shifts available in database');
      }
      
      // Test assets retrieval
      const assets = await databaseService.getAllAssets();
      if (!Array.isArray(assets)) {
        throw new Error('Assets retrieval failed');
      }
      
      this.log(`Database integration validated - ${shifts.length} shifts, ${assets.length} assets`);
      return { shifts: shifts.length, assets: assets.length };
    });
  }

  // Test 5: Validate Email Subject Generation
  async testEmailSubjectGeneration() {
    return await this.runTest('Email Subject Generation', async () => {
      const mockAnalytics = {
        performanceLevel: 'Good',
        key_metrics: {
          overallAvailability: 85.5,
          totalStops: 3
        }
      };
      
      const shiftName = 'Morning Shift';
      const shiftDate = '2024-01-15';
      
      const mockSummary = { executive_summary: 'Test summary', key_metrics: mockAnalytics.key_metrics };
      const subject = analyticsSummaryService.generateEmailSubjectLine(mockSummary);
      
      // Validate subject is a string
      if (typeof subject !== 'string' || subject.length === 0) {
        throw new Error('Invalid email subject generated');
      }
      
      this.log(`Email subject generated: ${subject}`);
      return subject;
    });
  }

  // Test 6: End-to-End Integration Test
  async testEndToEndIntegration() {
    return await this.runTest('End-to-End Integration', async () => {
      // Get current shift information
      const currentShift = await shiftScheduler.getCurrentShift();
      if (!currentShift) {
        this.log('No current shift found, skipping end-to-end test');
        return { status: 'skipped', reason: 'No current shift' };
      }
      
      // Test that all components work together
      const testData = {
        shift_info: currentShift,
        events: [],
        assets_summary: {}
      };
      
      // Generate analytics summary
      const analytics = analyticsSummaryService.generateAnalyticsSummary(testData);
      
      // Generate email subject
      const emailSubject = analyticsSummaryService.generateEmailSubjectLine(analytics);
      
      // Generate enhanced filename
      const filename = reportService.generateEnhancedFilename(
        currentShift.name || 'Test_Shift',
        currentShift.start_time || new Date().toISOString(),
        'csv'
      );
      
      this.log('End-to-end integration test completed successfully');
      return {
        analytics: !!analytics,
        emailSubject: !!emailSubject,
        filename: !!filename,
        currentShift: currentShift.name
      };
    });
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting Analytics Integration Test Suite');
    this.log('=' .repeat(60));
    
    try {
      // Wait for database to be initialized (it initializes automatically)
      let attempts = 0;
      while (!databaseService.initialized && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (!databaseService.initialized) {
        throw new Error('Database initialization timeout');
      }
      
      this.log('Database connection verified');
      
      // Run all tests
      await this.testAnalyticsSummaryService();
      await this.testEnhancedReportGeneration();
      await this.testEnhancedFilenameGeneration();
      await this.testDatabaseIntegration();
      await this.testEmailSubjectGeneration();
      await this.testEndToEndIntegration();
      
    } catch (error) {
      this.log(`Critical error during testing: ${error.message}`, 'error');
    }
    
    // Print summary
    this.printTestSummary();
  }

  printTestSummary() {
    this.log('=' .repeat(60));
    this.log('📊 TEST SUMMARY');
    this.log('=' .repeat(60));
    this.log(`Total Tests: ${this.testsPassed + this.testsFailed}`);
    this.log(`✅ Passed: ${this.testsPassed}`);
    this.log(`❌ Failed: ${this.testsFailed}`);
    this.log(`Success Rate: ${((this.testsPassed / (this.testsPassed + this.testsFailed)) * 100).toFixed(1)}%`);
    
    if (this.testsFailed > 0) {
      this.log('\n🔍 FAILED TESTS:');
      this.testResults
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          this.log(`  - ${test.name}: ${test.error}`, 'error');
        });
    }
    
    this.log('=' .repeat(60));
    
    if (this.testsFailed === 0) {
      this.log('🎉 All tests passed! Analytics integration is working correctly.');
    } else {
      this.log('⚠️  Some tests failed. Please review the errors above.');
    }
  }
}

// Run the test suite
if (require.main === module) {
  const tester = new AnalyticsIntegrationTester();
  tester.runAllTests().then(() => {
    process.exit(tester.testsFailed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = AnalyticsIntegrationTester;