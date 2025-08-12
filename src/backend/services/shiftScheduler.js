const cron = require('node-cron');
const databaseService = require('./databaseService');
const reportService = require('./reportService');
const s3Service = require('./s3Service');
const sendEmail = require('../utils/sendEmail');

class ShiftScheduler {
  constructor() {
    this.currentShift = null;
    this.scheduledJobs = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Get current shift if any
      this.currentShift = await databaseService.getCurrentShift();
      
      // Setup shift detection based on settings
      await this.setupShiftSchedules();
      
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
      const autoDetection = process.env.AUTO_SHIFT_DETECTION === 'true';
      
      if (!autoDetection) {
        console.log('⚠️ Automatic shift detection disabled');
        return;
      }

      const shiftTimes = process.env.SHIFT_TIMES?.split(',') || ['08:00', '16:00', '00:00'];
      
      // Clear existing schedules
      this.scheduledJobs.forEach(job => {
        if (job && typeof job.stop === 'function') {
          job.stop();
        }
      });
      this.scheduledJobs.clear();

      // Setup shift detection for each configured time
      shiftTimes.forEach((time, index) => {
        const [hour, minute] = time.split(':');
        const cronExpression = `${minute} ${hour} * * *`; // Daily at specified time
        
        const job = cron.schedule(cronExpression, async () => {
          await this.handleAutomaticShiftChange(index + 1, time);
        }, {
          scheduled: true,
          timezone: 'America/New_York' // Adjust timezone as needed
        });

        this.scheduledJobs.set(`shift_${index}`, job);
        console.log(`📅 Scheduled automatic shift detection for ${time} (${cronExpression})`);
      });

    } catch (error) {
      console.error('❌ Failed to setup shift schedules:', error.message);
    }
  }

  setupDataRetentionCleanup() {
    // Daily cleanup at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.performDataRetentionCleanup();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    this.scheduledJobs.set('data_cleanup', cleanupJob);
    console.log('📅 Scheduled daily data retention cleanup at 2:00 AM');
  }

  async handleAutomaticShiftChange(shiftNumber, shiftTime) {
    try {
      console.log(`🔄 Processing automatic shift change: Shift ${shiftNumber} at ${shiftTime}`);

      // End current shift if exists
      if (this.currentShift && this.currentShift.status === 'active') {
        await this.endCurrentShift(true); // true = automatic
      }

      // Start new shift
      await this.startNewShift(shiftNumber, shiftTime, true); // true = automatic

    } catch (error) {
      console.error('❌ Automatic shift change handling failed:', error.message);
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
      if (!this.currentShift || this.currentShift.status !== 'active') {
        throw new Error('No active shift to end');
      }

      console.log(`🔄 Ending shift manually: ${this.currentShift.shift_name || this.currentShift.name}`);
      
      await this.endCurrentShift(false, notes); // false = manual
      
      return true;

    } catch (error) {
      console.error('❌ Manual shift end failed:', error.message);
      throw error;
    }
  }

  async endCurrentShift(isAutomatic = false, notes = '') {
    if (!this.currentShift) return;

    try {
      const endTime = new Date();
      const shiftId = this.currentShift.id || this.currentShift._id;
      
      // Add SHIFT_END event for all active assets
      const assets = await databaseService.getAllAssets();
      for (const asset of assets) {
        await databaseService.createEvent({
          asset_id: asset.id || asset._id,
          logger_id: asset.logger_id,
          event_type: 'SHIFT_END',
          previous_state: asset.current_state || null,
          new_state: null,
          timestamp: endTime,
          shift_id: shiftId,
          metadata: {
            shift_name: this.currentShift.shift_name || this.currentShift.name,
            auto_generated: isAutomatic,
            note: `Shift ended ${isAutomatic ? 'automatically' : 'manually'}`
          }
        });
      }

      // Update shift record
      const updatedShift = await databaseService.updateShift(shiftId, {
        status: 'completed',
        end_time: endTime,
        notes: notes || this.currentShift.notes
      });

      // Generate comprehensive shift report
      await this.generateAndSendShiftReport(shiftId);
      
      // Archive shift events automatically
      await this.archiveShiftEvents(shiftId, isAutomatic);
      
      console.log(`✅ Shift ended: ${this.currentShift.name}`);
      this.currentShift = null;
      
    } catch (error) {
      console.error('❌ Failed to end current shift:', error.message);
      throw error;
    }
  }

  async startNewShift(shiftNumber = null, shiftTime = null, isAutomatic = false, customName = null, notes = '') {
    try {
      const startTime = new Date();
      
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
      this.currentShift = await databaseService.createShift ? 
        await databaseService.createShift({
          shift_number: shiftNumber,
          name: shiftName,
          start_time: startTime,
          active: true,
          notes: notes,
          auto_generated: isAutomatic
        }) :
        databaseService.memoryDB.createShift({
          shift_number: shiftNumber,
          name: shiftName,
          start_time: startTime,
          active: true,
          notes: notes,
          auto_generated: isAutomatic
        });

      // Add SHIFT_START event for all active assets
      const assets = await databaseService.getAllAssets();
      for (const asset of assets) {
        await databaseService.createEvent({
          asset: asset._id,
          asset_name: asset.name,
          logger_id: asset.logger_id,
          event_type: 'SHIFT_START',
          state: asset.current_state || 'UNKNOWN',
          timestamp: startTime,
          shift: this.currentShift._id,
          note: `Shift started ${isAutomatic ? 'automatically' : 'manually'}`,
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
      const settings = await databaseService.getSettings ? 
        await databaseService.getSettings() :
        databaseService.memoryDB.getSettings();

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
    try {
      console.log('📦 Archiving shift events...');
      
      // Get shift information
      const shift = await databaseService.getShift ? 
        await databaseService.getShift(shiftId) :
        databaseService.memoryDB.getShift(shiftId);

      if (!shift) {
        console.warn('⚠️ Shift not found for archiving events');
        return;
      }

      // Get all events from the shift
      const result = await databaseService.getAllEvents({
        startDate: shift.start_time,
        endDate: shift.end_time || new Date(),
        limit: 10000 // Get all events
      });

      const eventsToArchive = result.rows || [];

      if (eventsToArchive.length === 0) {
        console.log('📦 No events to archive for this shift');
        return;
      }

      // Create archive name
      const archiveName = `${shift.name || `Shift ${shift.shift_number}`} - ${new Date(shift.start_time).toLocaleDateString()}`;
      
      // Create archive with events data
      const archiveData = {
        name: archiveName,
        description: `Automatic archive created at shift end - ${eventsToArchive.length} events`,
        type: 'shift_end',
        created_by: 'system',
        shift_id: shiftId,
        event_count: eventsToArchive.length,
        data: {
          events: eventsToArchive.map(event => ({
            id: event.id,
            timestamp: event.timestamp,
            asset_id: event.asset_id,
            asset_name: event.asset?.name || 'Unknown',
            event_type: event.event_type,
            previous_state: event.previous_state,
            new_state: event.new_state,
            duration: event.duration,
            stop_reason: event.stop_reason,
            metadata: event.metadata
          })),
          shift_info: {
            id: shift.id || shift._id,
            name: shift.name,
            shift_number: shift.shift_number,
            start_time: shift.start_time,
            end_time: shift.end_time,
            status: shift.status
          }
        }
      };

      const archive = await databaseService.createArchive(archiveData);
      
      console.log(`✅ Successfully archived ${eventsToArchive.length} events for shift: ${archiveName}`);
      
      return archive;

    } catch (error) {
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
      const cleanedEvents = await databaseService.cleanupOldEvents ? 
        await databaseService.cleanupOldEvents(cutoffDate) :
        databaseService.memoryDB.cleanupEvents();

      console.log(`✅ Data retention cleanup completed. Cleaned ${cleanedEvents} old events.`);

    } catch (error) {
      console.error('❌ Data retention cleanup failed:', error.message);
    }
  }

  getCurrentShift() {
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