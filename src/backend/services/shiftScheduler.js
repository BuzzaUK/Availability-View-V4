const cron = require('node-cron');
const databaseService = require('./databaseService');
const reportService = require('./reportService');
const analyticsSummaryService = require('./analyticsSummaryService');
const s3Service = require('./s3Service');
const sendEmail = require('../utils/sendEmail');
const { sequelize } = require('../config/database');
const { Event } = require('../models/database');
const WebSocket = require('ws');
const logger = require('../utils/logger');

// Enhanced debugging utility has been replaced with logger from ../utils/logger

class ShiftScheduler {
  constructor() {
    this.currentShift = null;
    this.scheduledJobs = new Map();
    this.isInitialized = false;
    this.isResettingEventsTable = false;
    this.io = null; // Store io instance to avoid circular dependency
  }

  async initialize(io = null) {
    // Store the io instance if provided
    if (io) {
      this.io = io;
    }
    
    // Set global reference for shift scheduler
    global.shiftSchedulerInstance = this;
    
    try {
      // Get current shift if any
      this.currentShift = await databaseService.getCurrentShift();
      
      // Check for missed shifts during system downtime
      await this.validateShiftStateOnStartup();
      
      // Setup shift detection based on settings
      await this.setupShiftSchedules();
      
      // Setup continuous shift duration monitoring
      this.setupShiftDurationMonitoring();
      
      // Setup data retention cleanup (daily at 2 AM)
      this.setupDataRetentionCleanup();
      
      this.isInitialized = true;
      console.log('✅ Shift scheduler initialized');
    } catch (error) {
      console.error('❌ Shift scheduler initialization failed:', error.message);
    }
  }

  async setupShiftSchedules() {
    try {
      // Get notification settings from database to check if shift reports are enabled
      const notificationSettings = await databaseService.getNotificationSettings();
      
      if (!notificationSettings?.shiftSettings?.enabled) {
        console.log('⚠️ Automatic shift detection disabled in notification settings');
        return;
      }

      // Get shift times from notification settings instead of environment variables
      const shiftTimes = Array.isArray(notificationSettings.shiftSettings?.shiftTimes)
        ? notificationSettings.shiftSettings.shiftTimes
        : [];

      if (!shiftTimes.length) {
        console.warn('⚠️ No shift times configured in notification settings; skipping automatic shift scheduling');
        return;
      }
      
      // Convert HHMM format to HH:MM if needed
      const formattedShiftTimes = shiftTimes.map(time => {
        if (time.length === 4 && !time.includes(':')) {
          return `${time.substring(0, 2)}:${time.substring(2)}`;
        }
        return time;
      });
      
      // Clear existing schedules
      this.scheduledJobs.forEach(job => {
        if (job && typeof job.stop === 'function') {
          job.stop();
        }
      });
      this.scheduledJobs.clear();

      // Setup shift detection for each configured time
      formattedShiftTimes.forEach((time, index) => {
        const [hour, minute] = time.split(':');
        const cronExpression = `${minute} ${hour} * * *`; // Daily at specified time
        
        const job = cron.schedule(cronExpression, async () => {
          await this.handleAutomaticShiftChange(index + 1, time);
        }, {
          scheduled: true,
          timezone: 'Europe/London' // Match system timezone
        });

        this.scheduledJobs.set(`shift_${index}`, job);
        console.log(`📅 Scheduled automatic shift detection for ${time} (${cronExpression})`);
      });

      console.log(`✅ Shift scheduler configured with ${formattedShiftTimes.length} shifts: ${formattedShiftTimes.join(', ')}`);

    } catch (error) {
      console.error('❌ Failed to setup shift schedules:', error.message);
    }
  }

  setupShiftDurationMonitoring() {
    // Check every minute for shift duration exceeded
    const durationMonitorJob = cron.schedule('* * * * *', async () => {
      await this.checkShiftDurationAndTriggerArchiving();
    }, {
      scheduled: true,
      timezone: 'Europe/London'
    });

    this.scheduledJobs.set('duration_monitor', durationMonitorJob);
    console.log('📅 Scheduled continuous shift duration monitoring (every minute)');
  }

  setupDataRetentionCleanup() {
    // Daily cleanup at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.performDataRetentionCleanup();
    }, {
      scheduled: true,
      timezone: 'Europe/London'
    });

    this.scheduledJobs.set('data_cleanup', cleanupJob);
    console.log('📅 Scheduled daily data retention cleanup at 2:00 AM');
  }

  async updateSchedules() {
    try {
      console.log('🔄 Updating shift schedules from notification settings...');
      await this.setupShiftSchedules();
      console.log('✅ Shift schedules updated successfully');
    } catch (error) {
      console.error('❌ Failed to update shift schedules:', error.message);
    }
  }

  async handleAutomaticShiftChange(shiftNumber, shiftTime) {
    const debugContext = {
      shiftNumber,
      shiftTime,
      currentShift: this.currentShift ? {
        id: this.currentShift.id,
        name: this.currentShift.shift_name,
        status: this.currentShift.status
      } : null,
      timestamp: new Date().toISOString()
    };
    
    try {
      logger.info(`🔄 AUTOMATIC SHIFT CHANGE INITIATED`, debugContext);
      
      // Check if there's a current active shift
      if (this.currentShift && this.currentShift.status === 'active') {
        logger.info(`Ending current active shift: ${this.currentShift.shift_name || this.currentShift.name || 'Unknown Shift'}`, {
          currentShiftId: this.currentShift.id,
          currentShiftStartTime: this.currentShift.start_time
        });
        
        await this.endCurrentShift(true); // true = automatic
        logger.info('Current shift ended successfully');
      } else {
        logger.info('No active shift to end - proceeding to start new shift');
      }

      // Start new shift
      logger.info(`Starting new automatic shift: Shift ${shiftNumber}`);
      await this.startNewShift(shiftNumber, shiftTime, true); // true = automatic
      
      logger.info(`🎯 AUTOMATIC SHIFT CHANGE COMPLETED SUCCESSFULLY`, {
        newShiftId: this.currentShift?.id,
        newShiftName: this.currentShift?.shift_name,
        completedAt: new Date().toISOString()
      });

      // Emit shift change event to frontend
      try {
        if (this.io) {
          this.io.emit('shift_change', {
            timestamp: new Date().toISOString(),
            type: 'automatic',
            previousShift: debugContext.currentShift?.id || null,
            newShift: this.currentShift?.id || null,
            status: 'completed'
          });
        }
      } catch (error) {
        // Silently fail if Socket.IO is not available
      }

    } catch (error) {
      logger.error('❌ AUTOMATIC SHIFT CHANGE FAILED', {
        error: error.message,
        stack: error.stack,
        context: debugContext
      });
      throw error;
    }
  }

  async startShiftManually(shiftName, notes = '') {
    try {
      console.log(`🔄 Starting shift manually: ${shiftName}`);

      // End current shift if exists
      if (this.currentShift && this.currentShift.status === 'active') {
        await this.endCurrentShift(false); // false = manual
      }

      // Start new shift
      await this.startNewShift(null, null, false, shiftName, notes);

      return this.currentShift;

    } catch (error) {
      console.error('❌ Manual shift start failed:', error.message);
      throw error;
    }
  }

  async endShiftManually(notes = '') {
    try {
      // Refresh current shift from database to ensure synchronization
      await this.refreshCurrentShift();
      
      if (!this.currentShift || this.currentShift.status !== 'active') {
        throw new Error('No active shift to end');
      }

      // Safe access to shift name after null check
      const shiftName = this.currentShift.shift_name || this.currentShift.name || 'Unknown Shift';
      console.log(`🔄 Ending shift manually: ${shiftName}`);
      
      await this.endCurrentShift(false, notes); // false = manual
      
      return true;

    } catch (error) {
      console.error('❌ Manual shift end failed:', error.message);
      throw error;
    }
  }

  async refreshCurrentShift() {
    try {
      console.log('🔄 Refreshing current shift from database...');
      const dbCurrentShift = await databaseService.getCurrentShift();
      
      if (dbCurrentShift && dbCurrentShift.status === 'active') {
        this.currentShift = dbCurrentShift;
        console.log(`✅ Current shift refreshed: ${dbCurrentShift.shift_name} (ID: ${dbCurrentShift.id})`);
      } else {
        this.currentShift = null;
        console.log('✅ No active shift found in database');
      }
      
      return this.currentShift;
    } catch (error) {
      console.error('❌ Failed to refresh current shift:', error.message);
      throw error;
    }
  }

  async endCurrentShift(isAutomatic = false, notes = '') {
    if (!this.currentShift) {
      logger.info('No current shift to end');
      return;
    }

    const endTime = new Date();
    const shiftId = this.currentShift.id || this.currentShift._id;
    const debugContext = {
      shiftId,
      shiftName: this.currentShift.shift_name || this.currentShift.name || 'Unknown Shift',
      isAutomatic,
      notes,
      startTime: this.currentShift.start_time,
      endTime: endTime.toISOString()
    };

    try {
      logger.info('🔄 COMPREHENSIVE END-OF-SHIFT PROCESSING INITIATED', debugContext);
      
      // Step 1: Add SHIFT_END event for all active assets
      logger.info('📝 STEP 1: Adding SHIFT_END events for all assets');
      const assets = await databaseService.getAllAssets();
      logger.info(`Found ${assets.length} assets to process`, { assetCount: assets.length });
      for (const asset of assets) {
        await databaseService.createEvent({
          asset_id: asset.id,
          logger_id: asset.logger_id,
          event_type: 'SHIFT_END',
          previous_state: asset.current_state || null,
          new_state: null,
          timestamp: endTime,
          shift_id: shiftId,
          stop_reason: `Shift ended ${isAutomatic ? 'automatically' : 'manually'}`,
          metadata: {
            shift_name: this.currentShift.shift_name || this.currentShift.name,
            auto_generated: isAutomatic
          }
        });
      }

      logger.info(`Created SHIFT_END events for ${assets.length} assets`);

      // Step 2: Calculate enhanced analytics and update shift record
      logger.info('📝 STEP 2: Calculating enhanced analytics and updating shift record');
      
      // Get all events for this shift to calculate enhanced analytics
      const allShiftEvents = await databaseService.getAllEvents({ where: { shift_id: shiftId } });
      const shiftEvents = allShiftEvents.rows || allShiftEvents;
      
      // Calculate enhanced analytics
      const reportService = require('./reportService');
      const enhancedAnalytics = reportService.calculateEnhancedAnalyticsForStorage(
        this.currentShift, 
        shiftEvents, 
        assets
      );
      
      logger.info('Enhanced analytics calculated', enhancedAnalytics);
      
      const updatedShift = await databaseService.updateShift(shiftId, {
        status: 'completed',
        end_time: endTime,
        notes: notes || this.currentShift.notes,
        ...enhancedAnalytics
      });
      
      logger.info('Shift record updated with enhanced analytics', {
        shiftId,
        status: 'completed',
        endTime: endTime.toISOString(),
        enhancedAnalytics
      });
      
      logger.info('Enhanced analytics stored in shift record', {
        mtbf_minutes: enhancedAnalytics.mtbf_minutes,
        mttr_minutes: enhancedAnalytics.mttr_minutes,
        stop_frequency: enhancedAnalytics.stop_frequency,
        micro_stops_count: enhancedAnalytics.micro_stops_count
      });

      // Step 3: Archive all events from this shift
      logger.info('📦 STEP 3: Archiving shift events');
      const archiveResult = await this.archiveShiftEvents(shiftId, isAutomatic);
      
      if (archiveResult) {
        logger.info('Events archived successfully', {
          archiveId: archiveResult.id,
          eventCount: archiveResult.archived_data?.event_count || 'unknown'
        });
        
        // Emit archive creation event to frontend
        try {
          if (this.io) {
            this.io.emit('archive_created', {
              timestamp: new Date().toISOString(),
              archiveId: archiveResult.id,
              archiveName: archiveResult.title,
              eventCount: archiveResult.archived_data?.event_count || 0,
              type: 'shift_end'
            });
          }
        } catch (error) {
          // Silently fail if Socket.IO is not available
        }
      } else {
        logger.info('No archive result returned - events may not have been archived');
      }

      // Step 4: Generate and archive shift reports if enabled
      logger.info('📧 STEP 4: Checking shift report settings');
      const settings = await databaseService.getNotificationSettings();
      
      logger.info('Notification settings retrieved', {
        shiftSettingsEnabled: settings?.shiftSettings?.enabled,
        autoSendEnabled: settings?.shiftSettings?.autoSend
      });
      
      if (settings?.shiftSettings?.enabled && settings?.shiftSettings?.autoSend) {
        logger.info('📧 Generating and archiving shift reports (auto-send enabled)');
        try {
          const reportOptions = {
            includeCsv: true,
            includeHtml: true,
            includeAnalysis: true,
            sendEmail: true
          };
          
          logger.info('Report generation options', reportOptions);
          
          // Generate report from the shift data and store in Shift Reports Archive
          const reportResult = await reportService.generateAndArchiveShiftReportFromShift(shiftId, reportOptions);
          
          if (reportResult && reportResult.reportArchive) {
            logger.info('📧 Shift reports generated and archived successfully', {
              reportArchiveId: reportResult.reportArchive.id,
              reportsGenerated: Object.keys(reportResult.reports || {}).length
            });
            
            // Emit report generation event to frontend
            try {
              if (this.io) {
                this.io.emit('report_generated', {
                  timestamp: new Date().toISOString(),
                  reportArchiveId: reportResult.reportArchive.id,
                  reportTypes: Object.keys(reportResult.reports || {}),
                  shiftId: shiftId,
                  type: 'shift_end'
                });
              }
            } catch (error) {
              // Silently fail if Socket.IO is not available
            }
            
            // Send email notifications if configured and reports were generated
            if (reportOptions.sendEmail && reportResult.reports) {
              logger.info('📧 Generating analytics summary for email notifications');
              
              // Generate analytics summary from archived data
              let analyticsSummary = null;
              try {
                if (archiveResult && archiveResult.archived_data) {
                  const archivedData = archiveResult.archived_data;
                  const events = archivedData.events || [];
                  const shiftInfo = archivedData.shift_info || this.currentShift;
                  const assetsData = archivedData.assets_summary || { assets: [] };
                  
                  // Generate comprehensive analytics summary
                  analyticsSummary = await analyticsSummaryService.generateComprehensiveAnalyticsSummary(
                    events,
                    assetsData.assets,
                    shiftInfo
                  );
                  
                  logger.info('Analytics summary generated successfully', {
                    executiveSummaryLength: analyticsSummary.executive_summary?.length || 0,
                    keyMetricsCount: Object.keys(analyticsSummary.key_metrics || {}).length,
                    insightsCount: analyticsSummary.performance_insights?.length || 0,
                    recommendationsCount: analyticsSummary.recommendations?.length || 0
                  });
                } else {
                  logger.info('No archived data available for analytics summary generation');
                }
              } catch (analyticsError) {
                logger.error('Failed to generate analytics summary', {
                  error: analyticsError.message,
                  stack: analyticsError.stack
                });
                // Continue without analytics summary
              }
              
              logger.info('📧 Sending enhanced shift report email notifications');
              
              // Add timeout protection to prevent hanging during shift transition
              try {
                await Promise.race([
                  this.sendShiftReportNotifications(reportResult.reports, this.currentShift, analyticsSummary),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Email notifications timeout during shift transition')), 150000) // 2.5 minutes
                  )
                ]);
                logger.info('Enhanced email notifications sent successfully');
              } catch (emailTimeoutError) {
                logger.info('Email notifications timed out during shift transition', {
                  error: emailTimeoutError.message,
                  note: 'Continuing with shift transition to prevent hanging'
                });
                // Continue with shift transition even if email fails
              }
            }
          } else {
            logger.info('Report generation completed but no result returned', reportResult);
          }
        } catch (reportError) {
          logger.error('❌ Failed to generate and archive shift reports', {
            error: reportError.message,
            stack: reportError.stack
          });
          // Continue with the process even if reporting fails
        }
      } else {
        logger.info('📧 Shift report auto-send is disabled - skipping report generation', {
          shiftSettingsEnabled: settings?.shiftSettings?.enabled,
          autoSendEnabled: settings?.shiftSettings?.autoSend
        });
      }

      // Step 5: Reset Events table
      logger.info('🔄 STEP 5: Resetting Events table');
      
      // Emit data processing status - starting reset
      try {
        if (this.io) {
          this.io.emit('data_processing_status', {
            timestamp: new Date().toISOString(),
            status: 'processing',
            operation: 'events_table_reset',
            message: 'Resetting events table for new shift'
          });
        }
      } catch (error) {
        // Silently fail if Socket.IO is not available
      }
      
      // Add timeout protection for events table reset
      try {
        await Promise.race([
          this.resetEventsTable(shiftId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Events table reset timeout after 45 seconds')), 45000)
          )
        ]);
        logger.info('Events table reset completed');
      } catch (resetError) {
        logger.info('Events table reset timed out during shift transition', {
          error: resetError.message,
          note: 'Continuing with shift transition to prevent hanging'
        });
        // Continue with shift transition even if reset fails
      }
      
      // Emit data processing status - reset completed
      try {
        if (this.io) {
          this.io.emit('data_processing_status', {
            timestamp: new Date().toISOString(),
            status: 'completed',
            operation: 'events_table_reset',
            message: 'Events table reset completed successfully'
          });
        }
      } catch (error) {
        // Silently fail if Socket.IO is not available
      }

      // Step 6: Trigger dashboard reset via WebSocket
       logger.info('📊 STEP 6: Triggering dashboard reset via WebSocket');
       await this.triggerDashboardReset();
       logger.info('Dashboard reset triggered successfully');
       
       const completionSummary = {
        shiftId,
        shiftName: this.currentShift.shift_name || this.currentShift.name,
        duration: Math.round((endTime - new Date(this.currentShift.start_time)) / (1000 * 60)),
        completedAt: new Date().toISOString(),
        archiveCreated: !!archiveResult,
        reportsGenerated: settings?.shiftSettings?.enabled && settings?.shiftSettings?.autoSend
      };
      
      logger.info(`✅ COMPREHENSIVE END-OF-SHIFT PROCESSING COMPLETED`, completionSummary);
      this.currentShift = null;
      
    } catch (error) {
      logger.error('❌ FAILED TO COMPLETE END-OF-SHIFT PROCESSING', {
        error: error.message,
        stack: error.stack,
        context: debugContext
      });
      throw error;
    }
  }

  async startNewShift(shiftNumber = null, shiftTime = null, isAutomatic = false, customName = null, notes = '') {
    try {
      // Calculate proper start time
      let startTime;
      if (isAutomatic && shiftTime) {
        // For automatic shifts, use the scheduled shift time as start time
        const now = new Date();
        const [hour, minute] = shiftTime.split(':');
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(minute), 0, 0);
        
        // If the scheduled time is in the future (shouldn't happen for automatic shifts), use current time
        if (startTime > now) {
          startTime = now;
        }
      } else {
        // For manual shifts, use current time
        startTime = new Date();
      }
      
      // Generate shift name
      let shiftName;
      if (customName) {
        shiftName = customName;
      } else if (shiftNumber) {
        shiftName = `Shift ${shiftNumber} - ${startTime.toDateString()}`;
      } else {
        shiftName = `Manual Shift - ${startTime.toLocaleString()}`;
      }

      // Create new shift
      this.currentShift = await databaseService.createShift({
        shift_name: shiftName,
        start_time: startTime,
        status: 'active',
        notes: notes
      });
      
      // Add SHIFT_START event for all active assets
      const assets = await databaseService.getAllAssets();
      for (const asset of assets) {
        await databaseService.createEvent({
          asset_id: asset.id,
          logger_id: asset.logger_id,
          event_type: 'SHIFT_START',
          previous_state: null,
          new_state: asset.current_state || 'UNKNOWN',
          timestamp: startTime,
          shift_id: this.currentShift.id,
          stop_reason: `Shift started ${isAutomatic ? 'automatically' : 'manually'}`,
          metadata: {
            shift_name: shiftName,
            shift_time: shiftTime,
            auto_generated: isAutomatic
          }
        });
      }

      console.log(`✅ New shift started: ${shiftName}`);
      
    } catch (error) {
      console.error('❌ Failed to start new shift:', error.message);
      throw error;
    }
  }

  async generateAndSendShiftReport(shiftId) {
    try {
      // Get report recipients
      const settings = await databaseService.getSettings();

      const users = await databaseService.getAllUsers();
      const recipients = users
        .filter(user => user.shiftReportPreferences?.enabled)
        .map(user => user.email);

      // Generate comprehensive report using the new report service
      const result = await reportService.saveAndSendReport(shiftId, recipients, {
        includeCsv: true,
        includeHtml: true,
        includeAnalysis: true
      });

      console.log(`✅ Shift report generated and sent to ${recipients.length} recipients`);
      
      return result;

    } catch (error) {
      console.error('❌ Failed to generate and send shift report:', error.message);
      throw error;
    }
  }

  async archiveShiftEvents(shiftId, isAutomatic = false) {
    const debugContext = {
      shiftId,
      isAutomatic,
      timestamp: new Date().toISOString()
    };
    
    try {
      logger.info('📦 ARCHIVING SHIFT EVENTS INITIATED', debugContext);
      
      // Get shift information
      logger.info('Retrieving shift information from database');
      const shift = await databaseService.findShiftById(shiftId);
      
      if (!shift) {
        logger.info('⚠️ Shift not found for archiving events', { shiftId });
        return null;
      }
      
      logger.info('Shift information retrieved', {
        shiftName: shift.shift_name,
        startTime: shift.start_time,
        endTime: shift.end_time,
        status: shift.status
      });

      // Get all events from the shift using enhanced archiving method
      logger.info('Retrieving events for archiving');
      const archiveQuery = {
        startDate: shift.start_time,
        endDate: shift.end_time || new Date(),
        shift_id: shiftId
      };
      
      logger.info('Archive query parameters', archiveQuery);
      const archiveResult = await databaseService.getEventsForArchiving(archiveQuery);

      const eventsToArchive = archiveResult.events || [];
      const archiveMetadata = archiveResult.metadata || {};
      
      logger.info('Events retrieval completed', {
        eventCount: eventsToArchive.length,
        hasMetadata: !!archiveMetadata
      });

      if (eventsToArchive.length === 0) {
        logger.info('📦 No events found to archive for this shift', {
          shiftId,
          shiftName: shift.shift_name,
          queryPeriod: `${shift.start_time} to ${shift.end_time || new Date()}`
        });
        return null;
      }

      // Create archive name
      const archiveName = `${shift.shift_name || `Shift ${shift.shift_number}`} - ${new Date(shift.start_time).toLocaleDateString()}`;
      logger.info('Generated archive name', { archiveName });
      
      // Create archive with events data and enhanced metadata
      logger.info('Preparing archive data structure');
      const archiveData = {
        title: archiveName,
        description: `Automatic archive created at shift end - ${eventsToArchive.length} events`,
        archive_type: 'EVENTS',
        date_range_start: shift.start_time,
        date_range_end: shift.end_time || new Date(),
        created_by: 1, // Default to user ID 1 for system
        status: 'COMPLETED',
        archived_data: {
          event_count: eventsToArchive.length,
          archive_type: 'shift_end',
          shift_id: shiftId,
          archiving_metadata: {
            ...archiveMetadata,
            archiving_method: 'automatic_shift_end',
            archiving_timestamp: new Date().toISOString(),
            data_integrity_verified: true
          },
          events: eventsToArchive.map(event => ({
            id: event.id,
            timestamp: event.timestamp,
            asset_id: event.asset_id,
            asset_name: event.asset?.name || 'Unknown',
            logger_id: event.logger_id,
            event_type: event.event_type,
            previous_state: event.previous_state,
            new_state: event.new_state,
            duration: event.duration,
            stop_reason: event.stop_reason,
            metadata: event.metadata
          })),
          shift_info: {
            id: shift.id || shift._id,
            name: shift.shift_name,
            shift_number: shift.shift_number,
            start_time: shift.start_time,
            end_time: shift.end_time,
            status: shift.status,
            duration_minutes: shift.end_time ? 
              Math.round((new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60)) : null
          },
          assets_summary: this.generateAssetsSummary(eventsToArchive)
        }
      };

      logger.info('Archive data prepared', {
        title: archiveData.title,
        eventCount: eventsToArchive.length,
        shiftId: shiftId,
        archiveType: archiveData.archive_type,
        dateRange: `${archiveData.date_range_start} to ${archiveData.date_range_end}`
      });
      
      logger.info('Creating archive in database');
      
      // Emit data processing status - starting archive creation
      try {
        if (this.io) {
          this.io.emit('data_processing_status', {
            timestamp: new Date().toISOString(),
            status: 'processing',
            operation: 'archive_creation',
            message: `Creating archive: ${archiveName}`,
            details: {
              eventCount: eventsToArchive.length,
              shiftId: shiftId
            }
          });
        }
      } catch (error) {
        // Silently fail if Socket.IO is not available
      }
      
      // Add timeout protection for database archive creation
      const archive = await Promise.race([
        databaseService.createArchive(archiveData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database archive creation timeout after 60 seconds')), 60000)
        )
      ]);
      
      if (archive && archive.id) {
        logger.info('Archive created successfully', {
          archiveId: archive.id,
          title: archive.title
        });
      } else {
        logger.info('Archive creation returned null or invalid result', archive);
      }
      
      // Verify archive integrity with timeout protection
      if (archive && archive.id) {
        logger.info('Verifying archive integrity');
        try {
          const verification = await Promise.race([
            databaseService.verifyArchiveIntegrity(archive.id),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Archive integrity verification timeout')), 30000)
            )
          ]);
          if (verification.valid) {
            logger.info('✅ Archive integrity verified successfully');
          } else {
            logger.info('⚠️ Archive integrity verification failed', {
              error: verification.error || 'Unknown error',
              archiveId: archive.id
            });
          }
        } catch (verificationError) {
          logger.info('⚠️ Archive integrity verification timed out', {
            error: verificationError.message,
            archiveId: archive.id,
            note: 'Continuing with shift transition'
          });
          // Continue with shift transition even if verification fails
        }
      }
      
      const archiveSummary = {
        archiveId: archive?.id,
        archiveName,
        eventCount: eventsToArchive.length,
        shiftId,
        completedAt: new Date().toISOString()
      };
      
      logger.info(`✅ SHIFT EVENTS ARCHIVING COMPLETED SUCCESSFULLY`, archiveSummary);
      
      return archive;

    } catch (error) {
      logger.error('❌ SHIFT EVENTS ARCHIVING FAILED', {
        error: error.message,
        stack: error.stack,
        context: debugContext
      });
      console.error('❌ Failed to archive shift events:', error.message);
      // Don't throw error to prevent shift end from failing
    }
  }

  async performDataRetentionCleanup() {
    try {
      console.log('🧹 Starting data retention cleanup...');
      
      const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS) || 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean up old events
      const cleanedEvents = await databaseService.cleanupOldEvents(cutoffDate);

      console.log(`✅ Data retention cleanup completed. Cleaned ${cleanedEvents} old events.`);

    } catch (error) {
      console.error('❌ Data retention cleanup failed:', error.message);
    }
  }

  /**
   * Reset Events table and insert new SHIFT_START event
   */
  async resetEventsTable(previousShiftId) {
    // Prevent concurrent calls to resetEventsTable
    if (this.isResettingEventsTable) {
      console.log('⚠️ Events table reset already in progress, skipping duplicate call');
      return;
    }
    
    this.isResettingEventsTable = true;
    
    try {
      console.log('🔄 Resetting Events table...');
      
      // Clear all events from the Events table
      await Event.destroy({ where: {}, truncate: true });
      console.log('✅ Events table cleared');
      
      // Insert SHIFT_START event for all assets
      const assets = await databaseService.getAllAssets();
      const startTime = new Date();
      
      for (const asset of assets) {
        await databaseService.createEvent({
          asset_id: asset.id,
          logger_id: asset.logger_id,
          event_type: 'SHIFT_START',
          previous_state: null,
          new_state: asset.current_state || 'UNKNOWN',
          timestamp: startTime,
          shift_id: null, // Will be set when new shift starts
          stop_reason: 'New shift started - Events table reset',
          metadata: {
            previous_shift_id: previousShiftId,
            table_reset: true,
            auto_generated: true
          }
        });
      }
      
      console.log(`✅ Events table reset complete. Added SHIFT_START events for ${assets.length} assets`);
      
    } catch (error) {
      console.error('❌ Failed to reset Events table:', error.message);
      throw error;
    } finally {
      // Always clear the flag, even if an error occurred
      this.isResettingEventsTable = false;
    }
  }

  /**
   * Generate assets summary for archiving
   */
  generateAssetsSummary(events) {
    try {
      const assetStats = {};
      
      // Group events by asset
      events.forEach(event => {
        const assetId = event.asset_id;
        const assetName = event.asset?.name || 'Unknown';
        
        if (!assetStats[assetId]) {
          assetStats[assetId] = {
            asset_id: assetId,
            asset_name: assetName,
            total_events: 0,
            event_types: {},
            states: {},
            first_event: null,
            last_event: null
          };
        }
        
        const stats = assetStats[assetId];
        stats.total_events++;
        
        // Count event types
        stats.event_types[event.event_type] = (stats.event_types[event.event_type] || 0) + 1;
        
        // Count states
        if (event.new_state) {
          stats.states[event.new_state] = (stats.states[event.new_state] || 0) + 1;
        }
        
        // Track first and last events
        if (!stats.first_event || new Date(event.timestamp) < new Date(stats.first_event.timestamp)) {
          stats.first_event = {
            timestamp: event.timestamp,
            event_type: event.event_type,
            state: event.new_state
          };
        }
        
        if (!stats.last_event || new Date(event.timestamp) > new Date(stats.last_event.timestamp)) {
          stats.last_event = {
            timestamp: event.timestamp,
            event_type: event.event_type,
            state: event.new_state
          };
        }
      });
      
      return {
        total_assets: Object.keys(assetStats).length,
        assets: Object.values(assetStats)
      };
    } catch (error) {
      console.error('❌ Error generating assets summary:', error.message);
      return { total_assets: 0, assets: [], error: error.message };
    }
  }

  /**
   * Reset assets table accumulated data (runtime, downtime, stops)
   */
  async resetAssetsTable() {
    try {
      console.log('🔄 Resetting assets table accumulated data...');
      
      const { Asset } = require('../models/database');
      
      // Reset all accumulated metrics to zero
      const resetResult = await Asset.update({
        runtime: 0,
        downtime: 0,
        total_stops: 0,
        last_state_change: new Date()
      }, {
        where: {} // Update all assets
      });
      
      console.log(`✅ Assets table reset completed - ${resetResult[0]} assets updated`);
      return resetResult[0];
      
    } catch (error) {
      console.error('❌ Failed to reset assets table:', error.message);
      throw error;
    }
  }

  /**
   * Trigger dashboard reset via WebSocket
   */
  async triggerDashboardReset() {
    try {
      console.log('📊 Triggering dashboard reset...');
      
      // Step 1: Reset assets table accumulated data
      try {
        await this.resetAssetsTable();
        console.log('✅ Assets table reset completed');
      } catch (resetError) {
        console.error('⚠️ Assets table reset failed:', resetError.message);
        // Continue with WebSocket signals even if reset fails
      }
      
      // Step 2: Send WebSocket signals to frontend
      if (this.io) {
        // Emit dashboard reset event to all connected clients
        this.io.emit('dashboard_reset', {
          timestamp: new Date().toISOString(),
          message: 'Dashboard reset due to shift end processing',
          action: 'refresh_all_data'
        });
        
        // Emit shift update to refresh shift information
        this.io.emit('shift_update', {
          currentShift: null,
          message: 'Shift ended - dashboard reset'
        });
        
        // Emit events update to refresh events display
        this.io.emit('events_update', {
          action: 'table_reset',
          message: 'Events table reset for new shift'
        });
        
        console.log('✅ Dashboard reset signals sent via Socket.IO');
      } else {
        console.log('⚠️ Socket.IO server not available - dashboard reset signals not sent');
      }
      
    } catch (error) {
      console.error('❌ Failed to trigger dashboard reset:', error.message);
      // Don't throw error as this is not critical for shift processing
    }
  }

  /**
   * Send shift report notifications via email
   */
  async sendShiftReportNotifications(reports, shiftInfo, analyticsSummary = null) {
    try {
      console.log('📧 Sending shift report notifications...');
      
      // Get users with shift report preferences enabled
      const users = await databaseService.getAllUsers();
      const notificationUsers = users.filter(user => 
        user.shiftReportPreferences && 
        user.shiftReportPreferences.enabled === true
      );
      
      if (notificationUsers.length === 0) {
        console.log('📧 No users configured for shift report notifications');
        return;
      }
      
      // Prepare email content
      const shiftName = shiftInfo.shift_name || `Shift ${shiftInfo.shift_number}`;
      const shiftDate = new Date(shiftInfo.start_time).toLocaleDateString();
      const shiftTime = new Date(shiftInfo.start_time).toLocaleTimeString();
      
      // Generate dynamic subject based on analytics if available
      let emailSubject = `Shift Report - ${shiftName} - ${shiftDate}`;
      if (analyticsSummary && analyticsSummary.email_subject) {
        emailSubject = analyticsSummary.email_subject;
      }
      
      // Generate enhanced email body with analytics summary at the top
      let emailBody = '';
      
      if (analyticsSummary) {
        // Analytics summary section at the top
        const performanceColor = analyticsSummary.key_metrics.overallAvailability >= 90 ? '#28a745' : 
                                analyticsSummary.key_metrics.overallAvailability >= 75 ? '#ffc107' : '#dc3545';
        
        emailBody += `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 12px;">
            <!-- Mobile-First Responsive Styles -->
            <style>
              @media only screen and (max-width: 600px) {
                .container { padding: 10px !important; }
                .header { padding: 20px 15px !important; }
                .metrics-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
                .metric-card { padding: 15px !important; }
                .metric-value { font-size: 24px !important; }
                .section-card { padding: 15px !important; }
              }
            </style>
            
            <!-- Enhanced Analytics Summary Header -->
            <div class="header" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; text-align: center; box-shadow: 0 4px 12px rgba(0,123,255,0.3);">
              <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
              <h1 style="margin: 0 0 15px 0; font-size: 28px; font-weight: 700;">Shift Analytics Summary</h1>
              <h2 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 500; opacity: 0.9;">${shiftName} - ${shiftDate}</h2>
              <div style="font-size: 16px; line-height: 1.6; background: rgba(255,255,255,0.15); padding: 18px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <div style="font-size: 20px; margin-bottom: 8px;">📋</div>
                ${analyticsSummary.executive_summary}
              </div>
            </div>
            
            <!-- Enhanced Key Metrics Grid with Icons and Status Indicators -->
            <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; margin-bottom: 30px;">
              <!-- Overall Availability Card -->
              <div class="metric-card" style="background: white; padding: 24px; border-radius: 12px; text-align: center; border: 3px solid ${performanceColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${performanceColor};"></div>
                <div style="font-size: 36px; margin-bottom: 8px;">${(analyticsSummary.key_metrics?.overallAvailability || 0) >= 90 ? '🟢' : (analyticsSummary.key_metrics?.overallAvailability || 0) >= 75 ? '🟡' : '🔴'}</div>
                <div class="metric-value" style="font-size: 36px; font-weight: 700; color: ${performanceColor}; margin-bottom: 8px; line-height: 1;">
                  ${(analyticsSummary.key_metrics?.overallAvailability || 0).toFixed(1)}%
                </div>
                <div style="color: #495057; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Overall Availability</div>
                <div style="margin-top: 8px; font-size: 12px; color: #6c757d;">${(analyticsSummary.key_metrics?.overallAvailability || 0) >= 90 ? 'Excellent Performance' : (analyticsSummary.key_metrics?.overallAvailability || 0) >= 75 ? 'Good Performance' : 'Needs Attention'}</div>
              </div>
              
              <!-- Total Downtime Card -->
              <div class="metric-card" style="background: white; padding: 24px; border-radius: 12px; text-align: center; border: 3px solid #dc3545; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #dc3545;"></div>
                <div style="font-size: 36px; margin-bottom: 8px;">⏱️</div>
                <div class="metric-value" style="font-size: 36px; font-weight: 700; color: #dc3545; margin-bottom: 8px; line-height: 1;">
                  ${Math.round(analyticsSummary.key_metrics.totalDowntime)}
                </div>
                <div style="color: #495057; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total Downtime (min)</div>
                <div style="margin-top: 8px; font-size: 12px; color: #6c757d;">${Math.round(analyticsSummary.key_metrics.totalDowntime / 60 * 10) / 10} hours</div>
              </div>
              
              <!-- Total Events Card -->
              <div class="metric-card" style="background: white; padding: 24px; border-radius: 12px; text-align: center; border: 3px solid #007bff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #007bff;"></div>
                <div style="font-size: 36px; margin-bottom: 8px;">📈</div>
                <div class="metric-value" style="font-size: 36px; font-weight: 700; color: #007bff; margin-bottom: 8px; line-height: 1;">
                  ${analyticsSummary.key_metrics.totalEvents}
                </div>
                <div style="color: #495057; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total Events</div>
                <div style="margin-top: 8px; font-size: 12px; color: #6c757d;">Activity Level: ${analyticsSummary.key_metrics.totalEvents > 50 ? 'High' : analyticsSummary.key_metrics.totalEvents > 20 ? 'Medium' : 'Low'}</div>
              </div>
              
              <!-- Critical Stops Card -->
              <div class="metric-card" style="background: white; padding: 24px; border-radius: 12px; text-align: center; border: 3px solid #ffc107; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #ffc107;"></div>
                <div style="font-size: 36px; margin-bottom: 8px;">⚠️</div>
                <div class="metric-value" style="font-size: 36px; font-weight: 700; color: #ffc107; margin-bottom: 8px; line-height: 1;">
                  ${analyticsSummary.key_metrics.criticalStops}
                </div>
                <div style="color: #495057; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Critical Stops</div>
                <div style="margin-top: 8px; font-size: 12px; color: #6c757d;">${analyticsSummary.key_metrics.criticalStops === 0 ? 'No Issues' : 'Requires Review'}</div>
              </div>
            </div>`;
        
        // Enhanced Performance Insights with Better Visual Hierarchy
        if (analyticsSummary.performance_insights && analyticsSummary.performance_insights.length > 0) {
          emailBody += `
            <div class="section-card" style="background: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-top: 4px solid #28a745;">
              <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div style="font-size: 32px; margin-right: 12px;">🔍</div>
                <h3 style="color: #495057; margin: 0; font-size: 22px; font-weight: 600;">Key Performance Insights</h3>
              </div>`;
          analyticsSummary.performance_insights.forEach((insight, index) => {
            emailBody += `
              <div style="background: linear-gradient(135deg, #e8f5e8, #f0f9f0); padding: 16px; margin: 12px 0; border-left: 5px solid #28a745; border-radius: 8px; box-shadow: 0 2px 4px rgba(40,167,69,0.1);">
                <div style="display: flex; align-items: flex-start;">
                  <div style="background: #28a745; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">${index + 1}</div>
                  <div style="color: #155724; line-height: 1.5; font-size: 15px;">${insight}</div>
                </div>
              </div>`;
          });
          emailBody += `</div>`;
        }
        
        // Enhanced Recommendations with Priority Indicators
        if (analyticsSummary.recommendations && analyticsSummary.recommendations.length > 0) {
          emailBody += `
            <div class="section-card" style="background: linear-gradient(135deg, #fff3cd, #fef9e7); padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 2px solid #ffeaa7; box-shadow: 0 4px 12px rgba(255,193,7,0.2); border-top: 4px solid #ffc107;">
              <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div style="font-size: 32px; margin-right: 12px;">💡</div>
                <h3 style="color: #856404; margin: 0; font-size: 22px; font-weight: 600;">Actionable Recommendations</h3>
              </div>`;
          analyticsSummary.recommendations.forEach((recommendation, index) => {
            const priorityIcon = index === 0 ? '🔥' : index === 1 ? '⭐' : '📌';
            const priorityLabel = index === 0 ? 'High Priority' : index === 1 ? 'Medium Priority' : 'Standard';
            const priorityColor = index === 0 ? '#dc3545' : index === 1 ? '#ffc107' : '#6c757d';
            emailBody += `
              <div style="background: white; padding: 18px; margin: 12px 0; border-left: 5px solid #ffc107; border-radius: 8px; box-shadow: 0 2px 6px rgba(255,193,7,0.15);">
                <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                  <div style="font-size: 20px; margin-right: 8px;">${priorityIcon}</div>
                  <div style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${priorityLabel}</div>
                </div>
                <div style="color: #856404; line-height: 1.6; font-size: 15px; margin-left: 28px;">${recommendation}</div>
              </div>`;
          });
          emailBody += `</div>`;
        }
      }
      
      // Enhanced Standardized Summary Section
      const shiftDuration = Math.round((new Date(shiftInfo.end_time) - new Date(shiftInfo.start_time)) / (1000 * 60 * 60 * 10)) / 10;
      emailBody += `
            <!-- Standardized Shift Summary Section -->
            <div class="section-card" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-top: 4px solid #6c757d; margin-bottom: 25px;">
              <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div style="font-size: 32px; margin-right: 12px;">📋</div>
                <h3 style="color: #495057; margin: 0; font-size: 22px; font-weight: 600;">Shift Summary Details</h3>
              </div>
              
              <!-- Enhanced Shift Information Grid -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 25px;">
                <div style="background: #f8f9fa; padding: 18px; border-radius: 8px; border-left: 4px solid #007bff;">
                  <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 20px; margin-right: 8px;">🏷️</span>
                    <span style="font-weight: 600; color: #495057; font-size: 14px; text-transform: uppercase;">Shift Name</span>
                  </div>
                  <div style="font-size: 18px; font-weight: 700; color: #007bff;">${shiftName}</div>
                </div>
                
                <div style="background: #f8f9fa; padding: 18px; border-radius: 8px; border-left: 4px solid #28a745;">
                  <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 20px; margin-right: 8px;">📅</span>
                    <span style="font-weight: 600; color: #495057; font-size: 14px; text-transform: uppercase;">Date</span>
                  </div>
                  <div style="font-size: 18px; font-weight: 700; color: #28a745;">${shiftDate}</div>
                </div>
                
                <div style="background: #f8f9fa; padding: 18px; border-radius: 8px; border-left: 4px solid #ffc107;">
                  <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 20px; margin-right: 8px;">⏰</span>
                    <span style="font-weight: 600; color: #495057; font-size: 14px; text-transform: uppercase;">Duration</span>
                  </div>
                  <div style="font-size: 18px; font-weight: 700; color: #ffc107;">${shiftDuration} hours</div>
                </div>
                
                <div style="background: #f8f9fa; padding: 18px; border-radius: 8px; border-left: 4px solid #dc3545;">
                  <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 20px; margin-right: 8px;">🕐</span>
                    <span style="font-weight: 600; color: #495057; font-size: 14px; text-transform: uppercase;">Time Range</span>
                  </div>
                  <div style="font-size: 14px; color: #dc3545; line-height: 1.4;">
                    <div><strong>Start:</strong> ${new Date(shiftInfo.start_time).toLocaleString()}</div>
                    <div><strong>End:</strong> ${new Date(shiftInfo.end_time).toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              <!-- Enhanced Attachments Section -->
              <div style="background: linear-gradient(135deg, #e3f2fd, #f3e5f5); padding: 20px; border-radius: 10px; border: 2px solid #e1f5fe; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 24px; margin-right: 10px;">📎</span>
                  <h4 style="margin: 0; color: #1565c0; font-size: 18px; font-weight: 600;">Report Attachments</h4>
                </div>
                <p style="margin: 0; color: #1565c0; line-height: 1.5; font-size: 15px;">
                  Comprehensive shift reports are attached in multiple formats:
                </p>
                <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px;">
                  <span style="background: #1976d2; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold;">📊 CSV Data</span>
                  <span style="background: #7b1fa2; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold;">📄 HTML Report</span>
                  <span style="background: #388e3c; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold;">📈 Analytics</span>
                </div>
              </div>
              
              <!-- System Footer -->
              <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                <div style="font-size: 16px; margin-bottom: 5px;">🏭</div>
                <div style="font-size: 12px; color: #6c757d; font-weight: 500;">
                  Automated notification from Manufacturing Dashboard System
                </div>
                <div style="font-size: 11px; color: #adb5bd; margin-top: 4px;">
                  Generated on ${new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        `;
      
      // Prepare attachments with enhanced filenames
      const attachments = [];
      
      // Generate enhanced filenames with Date, Time, and Shift Name
      const generateEnhancedFilename = (extension) => {
        const date = new Date(shiftInfo.start_time);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        const sanitizedShiftName = shiftName.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
        
        return `${dateStr}_${timeStr}_${sanitizedShiftName}_Shift_Report.${extension}`;
      };
      
      if (reports.csv) {
        attachments.push({
          filename: generateEnhancedFilename('csv'),
          content: reports.csv,
          contentType: 'text/csv'
        });
      }
      
      if (reports.html) {
        attachments.push({
          filename: generateEnhancedFilename('html'),
          content: reports.html,
          contentType: 'text/html'
        });
      }
      
      // Send emails to all configured users with timeout protection
      const emailPromises = notificationUsers.map(async (user) => {
        try {
          const sendEmail = require('../utils/sendEmail');
          
          // Add timeout wrapper for individual email sending
          await Promise.race([
            sendEmail({
              to: user.email,
              subject: emailSubject,
              html: emailBody,
              attachments: attachments
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Email timeout for ${user.email}`)), 45000) // 45 seconds per email
            )
          ]);
          
          console.log(`📧 Shift report sent to: ${user.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send shift report to ${user.email}:`, emailError.message);
        }
      });
      
      // Add overall timeout for all email operations
      const emailTimeout = 120000; // 2 minutes total for all emails
      await Promise.race([
        Promise.allSettled(emailPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email notifications timeout after 2 minutes')), emailTimeout)
        )
      ]);
      
      console.log(`📧 Shift report notifications completed for ${notificationUsers.length} users`);
      
    } catch (error) {
      console.error('❌ Failed to send shift report notifications:', error.message);
    }
  }

  /**
   * Continuously monitor shift duration and trigger archiving when exceeded
   */
  async checkShiftDurationAndTriggerArchiving() {
    try {
      // Refresh current shift from database
      await this.refreshCurrentShift();
      
      if (!this.currentShift || this.currentShift.status !== 'active') {
        // No active shift to monitor
        return;
      }

      // Get shift duration setting from database
      const settings = await databaseService.getSettings();
      const shiftDurationMinutes = settings?.shiftDuration;
      
      if (!shiftDurationMinutes || shiftDurationMinutes <= 0) {
        // No shift duration configured, skip monitoring
        return;
      }

      // Calculate shift elapsed time
      const now = new Date();
      const shiftStartTime = new Date(this.currentShift.start_time);
      const elapsedMinutes = Math.floor((now - shiftStartTime) / (1000 * 60));
      
      // Check if shift duration has been exceeded
      if (elapsedMinutes >= shiftDurationMinutes) {
        const debugContext = {
          shiftId: this.currentShift.id,
          shiftName: this.currentShift.shift_name || this.currentShift.name || 'Unknown Shift',
          startTime: this.currentShift.start_time,
          elapsedMinutes,
          configuredDurationMinutes: shiftDurationMinutes,
          exceedByMinutes: elapsedMinutes - shiftDurationMinutes
        };
        
        logger.info(`⏰ SHIFT DURATION EXCEEDED - Triggering automatic end-of-shift archiving`, debugContext);
        
        // Trigger automatic shift end and archiving
        await this.endCurrentShift(true, `Automatic end due to shift duration exceeded (${elapsedMinutes}/${shiftDurationMinutes} minutes)`);
        
        logger.info(`✅ Automatic end-of-shift archiving completed for exceeded duration`, {
          completedAt: new Date().toISOString(),
          totalDurationMinutes: elapsedMinutes
        });
      }
      
    } catch (error) {
      logger.error('❌ Shift duration monitoring failed', {
        error: error.message,
        stack: error.stack
      });
      console.error('❌ Shift duration monitoring error:', error.message);
    }
  }

  /**
   * Validate shift state on system startup to detect missed shifts during downtime
   */
  async validateShiftStateOnStartup() {
    try {
      logger.info('🔍 VALIDATING SHIFT STATE ON STARTUP');
      
      // Get notification settings to check shift times
      const notificationSettings = await databaseService.getNotificationSettings();
      
      if (!notificationSettings?.shiftSettings?.enabled) {
        logger.info('Automatic shift detection disabled - skipping startup validation');
        return;
      }
      
      const shiftTimes = Array.isArray(notificationSettings.shiftSettings?.shiftTimes)
        ? notificationSettings.shiftSettings.shiftTimes
        : [];
      
      if (!shiftTimes.length) {
        logger.info('No shift times configured - skipping startup validation');
        return;
      }
      
      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes(); // Convert to HHMM format
      
      // Convert shift times to HHMM format for comparison
      const formattedShiftTimes = shiftTimes.map(time => {
        if (time.includes(':')) {
          const [hours, minutes] = time.split(':');
          return parseInt(hours) * 100 + parseInt(minutes);
        }
        return parseInt(time);
      }).sort((a, b) => a - b);
      
      // Determine which shift should be active based on current time
      let expectedShiftIndex = 0;
      for (let i = 0; i < formattedShiftTimes.length; i++) {
        if (currentTime >= formattedShiftTimes[i]) {
          expectedShiftIndex = i;
        } else {
          break;
        }
      }
      
      const expectedShiftNumber = expectedShiftIndex + 1;
      const expectedShiftTime = shiftTimes[expectedShiftIndex];
      
      logger.info('Startup shift validation', {
        currentTime: `${Math.floor(currentTime / 100).toString().padStart(2, '0')}:${(currentTime % 100).toString().padStart(2, '0')}`,
        expectedShiftNumber,
        expectedShiftTime,
        currentShiftId: this.currentShift?.id,
        currentShiftName: this.currentShift?.shift_name,
        currentShiftStatus: this.currentShift?.status
      });
      
      // Check if we need to trigger a shift change
      let needsShiftChange = false;
      let changeReason = '';
      
      if (!this.currentShift || this.currentShift.status !== 'active') {
        needsShiftChange = true;
        changeReason = 'No active shift found';
      } else {
        // Check if the current shift started before the expected shift time
        const currentShiftStart = new Date(this.currentShift.start_time);
        const todayExpectedShiftTime = new Date(now);
        const [hours, minutes] = expectedShiftTime.includes(':') 
          ? expectedShiftTime.split(':') 
          : [expectedShiftTime.substring(0, 2), expectedShiftTime.substring(2)];
        todayExpectedShiftTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // If current shift started before today's expected shift time, we missed a shift change
        if (currentShiftStart < todayExpectedShiftTime) {
          needsShiftChange = true;
          changeReason = `Current shift started before expected shift time (${expectedShiftTime})`;
        }
      }
      
      if (needsShiftChange) {
        logger.info(`🔄 MISSED SHIFT DETECTED - Triggering recovery shift change`, {
          reason: changeReason,
          expectedShiftNumber,
          expectedShiftTime
        });
        
        // End current shift if exists
        if (this.currentShift && this.currentShift.status === 'active') {
          await this.endCurrentShift(true, `System startup recovery: ${changeReason}`);
        }
        
        // Start the expected shift
        await this.startNewShift(expectedShiftNumber, expectedShiftTime, true);
        
        // Trigger dashboard reset to ensure frontend is synchronized
        await this.triggerDashboardReset('System startup shift recovery');
        
        logger.info('✅ STARTUP SHIFT RECOVERY COMPLETED', {
          newShiftId: this.currentShift?.id,
          newShiftName: this.currentShift?.shift_name,
          recoveryTime: new Date().toISOString()
        });
      } else {
        logger.info('✅ Shift state validation passed - no recovery needed');
      }
      
    } catch (error) {
      logger.error('❌ Startup shift validation failed', {
        error: error.message,
        stack: error.stack
      });
      console.error('❌ Startup shift validation error:', error.message);
    }
  }

  async getCurrentShift() {
    // Always refresh from database to ensure synchronization
    await this.refreshCurrentShift();
    return this.currentShift;
  }

  getScheduledJobs() {
    return Array.from(this.scheduledJobs.keys());
  }

  async shutdown() {
    try {
      // Stop all scheduled jobs
      this.scheduledJobs.forEach(job => {
        if (job && typeof job.stop === 'function') {
          job.stop();
        }
      });
      this.scheduledJobs.clear();
      
      console.log('✅ Shift scheduler shutdown completed');
    } catch (error) {
      console.error('❌ Shift scheduler shutdown failed:', error.message);
    }
  }
}

module.exports = new ShiftScheduler();