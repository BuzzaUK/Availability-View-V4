const json2csv = require('json2csv').parse;
const path = require('path');
const fs = require('fs').promises;
const s3Service = require('./s3Service');
const sendEmail = require('../utils/sendEmail');
const databaseService = require('./databaseService');
const csvEnhancementService = require('./csvEnhancementService');

class ReportService {
  constructor() {
    this.databaseService = databaseService;
  }

  /**
   * Generate comprehensive shift report with multiple formats
   */
  async generateShiftReport(shiftId, options = {}) {
    try {
      const shift = await this.databaseService.findShiftById(shiftId);

      if (!shift) {
        throw new Error('Shift not found');
      }

      // Get all events for this shift
      const allEvents = await this.databaseService.getAllEvents({ where: { shift_id: shiftId } });
      const events = allEvents.rows || allEvents; // handle findAndCountAll vs findAll

      // Get all assets
      const allAssets = await this.databaseService.getAllAssets();

      const reportData = this.calculateShiftMetrics(shift, events, allAssets);
      
      const reports = {};

      // Generate CSV report
      if (options.includeCsv !== false) {
        reports.csv = await this.generateCsvReport(reportData);
      }

      // Generate HTML report
      if (options.includeHtml !== false) {
        reports.html = this.generateHtmlReport(reportData);
      }

      // Generate detailed analysis
      if (options.includeAnalysis !== false) {
        reports.analysis = this.generateDetailedAnalysis(reportData);
      }

      return {
        shift: reportData.shift,
        reports,
        metrics: reportData.metrics,
        assets: reportData.assets
      };

    } catch (error) {
      console.error('Error generating shift report:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive shift metrics
   */
  calculateShiftMetrics(shift, events, assets) {
    const shiftStart = new Date(shift.start_time);
    const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
    const shiftDuration = shiftEnd - shiftStart;

    // Group events by asset
    const eventsByAsset = {};
    events.forEach(event => {
      const assetId = event.asset_id || event.asset; // support both shapes
      if (!eventsByAsset[assetId]) {
        eventsByAsset[assetId] = [];
      }
      eventsByAsset[assetId].push(event);
    });

    // Calculate metrics for each asset
    const assetMetrics = assets.map(asset => {
      const assetId = asset.id || asset._id;
      const assetEvents = eventsByAsset[assetId] || [];
      const metrics = this.calculateAssetMetrics(asset, assetEvents, shiftStart, shiftEnd);
      
      return {
        asset_id: assetId,
        asset_name: asset.name,
        pin_number: asset.pin_number,
        location: asset.location,
        ...metrics
      };
    });

    // Calculate overall shift metrics
    const totalRuntime = assetMetrics.reduce((sum, asset) => sum + asset.runtime, 0);
    const totalDowntime = assetMetrics.reduce((sum, asset) => sum + asset.downtime, 0);
    const totalStops = assetMetrics.reduce((sum, asset) => sum + asset.stops, 0);
    const totalShortStops = assetMetrics.reduce((sum, asset) => sum + asset.short_stops, 0);
    const averageAvailability = assetMetrics.length > 0 ? 
      assetMetrics.reduce((sum, asset) => sum + asset.availability, 0) / assetMetrics.length : 0;

    // Calculate OEE components
    const plannedProductionTime = shiftDuration;
    const availability = totalRuntime / plannedProductionTime * 100;
    const performance = 85; // This would be calculated based on actual vs expected production
    const quality = 95; // This would be calculated based on quality metrics
    const oee = (availability * performance * quality) / 10000;

    return {
      shift: {
        ...shift,
        duration: shiftDuration,
        duration_hours: shiftDuration / (1000 * 60 * 60),
        start_time_formatted: shiftStart.toLocaleString(),
        end_time_formatted: shiftEnd.toLocaleString()
      },
      metrics: {
        total_runtime: totalRuntime,
        total_downtime: totalDowntime,
        total_stops: totalStops,
        total_short_stops: totalShortStops,
        average_availability: averageAvailability,
        availability_percentage: availability,
        performance_percentage: performance,
        quality_percentage: quality,
        oee_percentage: oee,
        shift_duration: shiftDuration,
        planned_production_time: plannedProductionTime
      },
      assets: assetMetrics,
      events: events.map(event => ({
        ...event,
        timestamp_formatted: new Date(event.timestamp).toLocaleString(),
        duration_minutes: event.duration ? event.duration / 60 : 0
      }))
    };
  }

  /**
   * Calculate detailed metrics for a single asset
   */
  calculateAssetMetrics(asset, events, shiftStart, shiftEnd) {
    let runtime = 0;
    let downtime = 0;
    let stops = 0;
    let shortStops = 0;
    let longestStop = 0;
    let shortestStop = Infinity;
    let totalStopDuration = 0;

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Calculate metrics from events
    sortedEvents.forEach(event => {
      if (event.event_type === 'STOP') {
        stops++;
        const stopDuration = event.duration || 0;
        totalStopDuration += stopDuration;
        
        if (stopDuration > longestStop) longestStop = stopDuration;
        if (stopDuration < shortestStop) shortestStop = stopDuration;
        
        if (event.is_short_stop) {
          shortStops++;
        }
      }
      
      runtime += event.runtime || 0;
      downtime += event.downtime || 0;
    });

    const totalTime = runtime + downtime;
    const availability = totalTime > 0 ? (runtime / totalTime) * 100 : 0;
    const averageStopDuration = stops > 0 ? totalStopDuration / stops : 0;

    return {
      runtime: runtime / 1000, // Convert to seconds
      downtime: downtime / 1000,
      stops,
      short_stops: shortStops,
      long_stops: stops - shortStops,
      availability: availability,
      longest_stop: longestStop / 1000,
      shortest_stop: shortestStop === Infinity ? 0 : shortestStop / 1000,
      average_stop_duration: averageStopDuration / 1000,
      current_state: asset.current_state || 'UNKNOWN'
    };
  }

  /**
   * Generate CSV report
   */
  async generateCsvReport(reportData) {
    try {
      // Shift summary CSV
      const shiftSummary = [{
        shift_number: reportData.shift.shift_number,
        shift_name: reportData.shift.name,
        start_time: reportData.shift.start_time_formatted,
        end_time: reportData.shift.end_time_formatted,
        duration_hours: reportData.shift.duration_hours.toFixed(2),
        total_runtime_minutes: (reportData.metrics.total_runtime / 60000).toFixed(2),
        total_downtime_minutes: (reportData.metrics.total_downtime / 60000).toFixed(2),
        total_stops: reportData.metrics.total_stops,
        average_availability: reportData.metrics.average_availability.toFixed(2),
        oee_percentage: reportData.metrics.oee_percentage.toFixed(2),
        notes: reportData.shift.notes || ''
      }];

      // Asset details CSV
      const assetDetails = reportData.assets.map(asset => ({
        asset_name: asset.asset_name,
        pin_number: asset.pin_number,
        location: asset.location || '',
        current_state: asset.current_state,
        runtime_minutes: (asset.runtime / 60).toFixed(2),
        downtime_minutes: (asset.downtime / 60).toFixed(2),
        availability_percentage: asset.availability.toFixed(2),
        total_stops: asset.stops,
        short_stops: asset.short_stops,
        long_stops: asset.long_stops,
        longest_stop_minutes: (asset.longest_stop / 60).toFixed(2),
        average_stop_duration_minutes: (asset.average_stop_duration / 60).toFixed(2)
      }));

      // Events CSV
      const eventDetails = reportData.events.map(event => ({
        timestamp: event.timestamp_formatted,
        asset_name: event.asset_name,
        event_type: event.event_type,
        state: event.state,
        duration_minutes: event.duration_minutes.toFixed(2),
        is_short_stop: event.is_short_stop || false,
        note: event.note || ''
      }));

      const csvReports = {
        shift_summary: json2csv(shiftSummary),
        asset_details: json2csv(assetDetails),
        event_details: json2csv(eventDetails)
      };

      return csvReports;

    } catch (error) {
      console.error('Error generating CSV report:', error);
      throw error;
    }
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(reportData) {
    const { shift, metrics, assets } = reportData;

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Shift Report - ${shift.name}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; }
            .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .metric-card { background-color: #e9f5ff; padding: 15px; border-radius: 5px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; color: #0066cc; }
            .metric-label { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .availability-high { color: #28a745; font-weight: bold; }
            .availability-medium { color: #ffc107; font-weight: bold; }
            .availability-low { color: #dc3545; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Shift Report: ${shift.name}</h1>
            <p><strong>Shift Number:</strong> ${shift.shift_number}</p>
            <p><strong>Date:</strong> ${shift.start_time_formatted} - ${shift.end_time_formatted}</p>
            <p><strong>Duration:</strong> ${shift.duration_hours.toFixed(2)} hours</p>
            ${shift.notes ? `<p><strong>Notes:</strong> ${shift.notes}</p>` : ''}
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value">${metrics.average_availability.toFixed(1)}%</div>
                <div class="metric-label">Average Availability</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.oee_percentage.toFixed(1)}%</div>
                <div class="metric-label">Overall OEE</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(metrics.total_runtime / 60000).toFixed(1)}</div>
                <div class="metric-label">Total Runtime (min)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.total_stops}</div>
                <div class="metric-label">Total Stops</div>
            </div>
        </div>

        <h2>Asset Performance</h2>
        <table>
            <thead>
                <tr>
                    <th>Asset Name</th>
                    <th>Current State</th>
                    <th>Runtime (min)</th>
                    <th>Downtime (min)</th>
                    <th>Availability</th>
                    <th>Stops</th>
                    <th>Avg Stop Duration (min)</th>
                </tr>
            </thead>
            <tbody>`;

    assets.forEach(asset => {
      const availabilityClass = asset.availability >= 80 ? 'availability-high' : 
                               asset.availability >= 60 ? 'availability-medium' : 'availability-low';
      
      html += `
                <tr>
                    <td>${asset.asset_name}</td>
                    <td>${asset.current_state}</td>
                    <td>${(asset.runtime / 60).toFixed(1)}</td>
                    <td>${(asset.downtime / 60).toFixed(1)}</td>
                    <td class="${availabilityClass}">${asset.availability.toFixed(1)}%</td>
                    <td>${asset.stops}</td>
                    <td>${(asset.average_stop_duration / 60).toFixed(1)}</td>
                </tr>`;
    });

    html += `
            </tbody>
        </table>
    </body>
    </html>`;

    return html;
  }

  /**
   * Generate detailed analysis
   */
  generateDetailedAnalysis(reportData) {
    const { metrics, assets } = reportData;
    
    const analysis = {
      performance_summary: {
        overall_rating: this.getPerformanceRating(metrics.average_availability),
        key_insights: [],
        recommendations: []
      },
      asset_analysis: assets.map(asset => ({
        asset_name: asset.asset_name,
        performance_rating: this.getPerformanceRating(asset.availability),
        key_metrics: {
          availability: asset.availability,
          stops: asset.stops,
          average_stop_duration: asset.average_stop_duration / 60
        },
        insights: this.generateAssetInsights(asset)
      }))
    };

    // Generate overall insights
    if (metrics.average_availability >= 85) {
      analysis.performance_summary.key_insights.push('Excellent overall availability performance');
    } else if (metrics.average_availability >= 70) {
      analysis.performance_summary.key_insights.push('Good availability with room for improvement');
    } else {
      analysis.performance_summary.key_insights.push('Below target availability - requires attention');
    }

    if (metrics.total_short_stops > metrics.total_stops * 0.7) {
      analysis.performance_summary.key_insights.push('High frequency of short stops detected');
      analysis.performance_summary.recommendations.push('Investigate causes of frequent short stops');
    }

    return analysis;
  }

  /**
   * Get performance rating based on availability
   */
  getPerformanceRating(availability) {
    if (availability >= 85) return 'Excellent';
    if (availability >= 75) return 'Good';
    if (availability >= 65) return 'Fair';
    return 'Poor';
  }

  /**
   * Generate insights for individual assets
   */
  generateAssetInsights(asset) {
    const insights = [];
    
    if (asset.availability >= 90) {
      insights.push('High availability - performing well');
    } else if (asset.availability < 60) {
      insights.push('Low availability - requires immediate attention');
    }

    if (asset.short_stops > asset.stops * 0.8) {
      insights.push('High frequency of short stops');
    }

    if (asset.average_stop_duration > 300) { // 5 minutes
      insights.push('Long average stop duration');
    }

    return insights;
  }

  /**
   * Save report to cloud storage and send email
   */
  async saveAndSendReport(shiftId, recipients, options = {}) {
    try {
      const report = await this.generateShiftReport(shiftId, options);

      // Save CSV file if exists
      let savedFiles = {};
      if (report.reports.csv) {
        const csvBuffer = Buffer.from(report.reports.csv.shift_summary + '\n\n' + report.reports.csv.asset_details + '\n\n' + report.reports.csv.event_details);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `shift_report_${shiftId}_${timestamp}.csv`;
        const filePath = path.join(process.cwd(), 'reports', filename);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, csvBuffer);
        savedFiles.csv = filePath;
      }

      // Send email if recipients provided
      if (recipients && recipients.length > 0) {
        await sendEmail({
          to: recipients,
          subject: `Shift Report - ${report.shift.shift_name || report.shift.name}`,
          text: 'Please find the attached shift report.',
          html: report.reports.html || '<p>Shift report attached.</p>'
        });
      }

      return { success: true, report, files: savedFiles };
    } catch (error) {
      console.error('Error saving/sending report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate enhanced CSV with custom templates
   */
  async generateEnhancedCsv(templateId, options = {}) {
    try {
      return await csvEnhancementService.generateAdvancedCsv({
        template_id: templateId,
        ...options
      });
    } catch (error) {
      console.error('Enhanced CSV generation failed:', error);
      throw error;
    }
  }

  /**
   * Get available CSV templates
   */
  async getCsvTemplates() {
    return csvEnhancementService.getAvailableTemplates();
  }

  /**
   * Schedule automated report generation
   */
  async scheduleAutomatedReport(scheduleConfig) {
    return await csvEnhancementService.scheduleAutomatedExport({
      ...scheduleConfig,
      export_options: {
        ...scheduleConfig.export_options,
        output_options: {
          save_file: true,
          upload_cloud: true,
          ...scheduleConfig.export_options?.output_options
        }
      }
    });
  }
}

module.exports = new ReportService();