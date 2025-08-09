const cron = require('node-cron');
const { sendAutomatedShiftReports } = require('../controllers/shiftController');
const NotificationSettings = require('../models/NotificationSettings');

class ShiftScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing Shift Scheduler...');
    await this.updateSchedules();
    this.isInitialized = true;
    console.log('Shift Scheduler initialized successfully');
  }

  async updateSchedules() {
    try {
      // Clear existing schedules
      this.clearAllSchedules();

      // Get current notification settings
      const settings = await NotificationSettings.findOne();
      
      if (!settings || !settings.shiftSettings || !settings.shiftSettings.enabled) {
        console.log('Shift report automation is disabled');
        return;
      }

      const { shiftTimes, autoSend } = settings.shiftSettings;
      
      if (!autoSend || !shiftTimes || shiftTimes.length === 0) {
        console.log('Auto-send is disabled or no shift times configured');
        return;
      }

      // Schedule jobs for each shift time
      shiftTimes.forEach((shiftTime, index) => {
        this.scheduleShiftEnd(shiftTime, index);
      });

      console.log(`Scheduled ${shiftTimes.length} shift report jobs`);

    } catch (error) {
      console.error('Error updating shift schedules:', error);
    }
  }

  scheduleShiftEnd(shiftTime, index) {
    try {
      // Parse shift time (format: "HHMM")
      if (!/^\d{4}$/.test(shiftTime)) {
        console.error(`Invalid shift time format: ${shiftTime}`);
        return;
      }

      const hours = parseInt(shiftTime.substring(0, 2));
      const minutes = parseInt(shiftTime.substring(2, 4));

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error(`Invalid shift time values: ${shiftTime}`);
        return;
      }

      // Create cron expression for the shift end time
      // This will trigger at the specified time every day
      const cronExpression = `${minutes} ${hours} * * *`;

      console.log(`Scheduling shift end report for ${shiftTime} (${hours}:${minutes}) with cron: ${cronExpression}`);

      const job = cron.schedule(cronExpression, async () => {
        console.log(`Shift end triggered for ${shiftTime}`);
        
        try {
          // Calculate the shift end time (current time when the job runs)
          const shiftEndTime = new Date();
          await sendAutomatedShiftReports(shiftEndTime);
        } catch (error) {
          console.error(`Error sending automated shift reports for ${shiftTime}:`, error);
        }
      }, {
        scheduled: false, // Don't start immediately
        timezone: 'America/New_York' // Adjust timezone as needed
      });

      // Store the job
      this.scheduledJobs.set(`shift_${index}_${shiftTime}`, job);

      // Start the job
      job.start();

      console.log(`Successfully scheduled shift end report for ${shiftTime}`);

    } catch (error) {
      console.error(`Error scheduling shift end for ${shiftTime}:`, error);
    }
  }

  clearAllSchedules() {
    console.log('Clearing all scheduled shift report jobs...');
    
    this.scheduledJobs.forEach((job, key) => {
      try {
        job.stop();
        job.destroy();
        console.log(`Stopped and destroyed job: ${key}`);
      } catch (error) {
        console.error(`Error stopping job ${key}:`, error);
      }
    });

    this.scheduledJobs.clear();
    console.log('All scheduled jobs cleared');
  }

  // Method to manually trigger a shift report (for testing)
  async triggerShiftReport(shiftTime) {
    try {
      console.log(`Manually triggering shift report for ${shiftTime}`);
      const shiftEndTime = new Date();
      await sendAutomatedShiftReports(shiftEndTime);
      console.log(`Manual shift report triggered successfully for ${shiftTime}`);
    } catch (error) {
      console.error(`Error manually triggering shift report for ${shiftTime}:`, error);
      throw error;
    }
  }

  // Get status of all scheduled jobs
  getScheduleStatus() {
    const status = {
      isInitialized: this.isInitialized,
      totalJobs: this.scheduledJobs.size,
      jobs: []
    };

    this.scheduledJobs.forEach((job, key) => {
      status.jobs.push({
        key,
        running: job.running || false,
        lastDate: job.lastDate || null,
        nextDate: job.nextDate || null
      });
    });

    return status;
  }

  // Graceful shutdown
  async shutdown() {
    console.log('Shutting down Shift Scheduler...');
    this.clearAllSchedules();
    this.isInitialized = false;
    console.log('Shift Scheduler shutdown complete');
  }
}

// Create singleton instance
const shiftScheduler = new ShiftScheduler();

module.exports = shiftScheduler;