const json2csv = require('json2csv').parse;
const path = require('path');
const fs = require('fs').promises;
const s3Service = require('./s3Service');
const sendEmail = require('../utils/sendEmail');
const databaseService = require('./databaseService');
const csvEnhancementService = require('./csvEnhancementService');
const analyticsSummaryService = require('./analyticsSummaryService');

class ReportService {
  constructor() {
    this.databaseService = databaseService;
  }

  /**
   * Generate enhanced filename with Date, Time, and Shift Name
   * @param {string} shiftName - Name of the shift
   * @param {Date} shiftDate - Date of the shift
   * @param {string} extension - File extension (csv, html, etc.)
   * @returns {string} Enhanced filename
   */
  generateEnhancedFilename(shiftName, shiftDate, extension) {
    const date = new Date(shiftDate);
    
    // Handle invalid dates
    if (isNaN(date.getTime())) {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const sanitizedShiftName = (shiftName || 'Unknown_Shift').replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
      return `${dateStr}_${timeStr}_${sanitizedShiftName}_Shift_Report.${extension}`;
    }
    
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const sanitizedShiftName = (shiftName || 'Unknown_Shift').replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
    
    return `${dateStr}_${timeStr}_${sanitizedShiftName}_Shift_Report.${extension}`;
  }

  /**
   * Generate comprehensive shift report with multiple formats and enhanced analytics
   */
  async generateShiftReport(shiftId, options = {}) {
    try {
      const shift = await this.databaseService.findShiftById(shiftId);

      if (!shift) {
        throw new Error('Shift not found');
      }

      // Get events for this shift using shift_id for consistency with archives
      const allEvents = await this.databaseService.getAllEvents();
      const allEventsArray = allEvents.rows || allEvents; // handle findAndCountAll vs findAll
      
      // Filter events by shift_id for consistency with archive filtering
      // This ensures reports and archives show the same data
      const events = allEventsArray.filter(event => {
        return event.shift_id === shiftId;
      });

      // Get all assets
      const allAssets = await this.databaseService.getAllAssets();

      const reportData = this.calculateShiftMetrics(shift, events, allAssets);
      
      // Generate enhanced analytics summary
      const archivedData = {
        events: events.map(event => ({
          id: event.id,
          timestamp: event.timestamp,
          asset_id: event.asset_id,
          asset: event.asset,
          event_type: event.event_type,
          previous_state: event.previous_state,
          new_state: event.new_state,
          duration: event.duration,
          stop_reason: event.stop_reason,
          metadata: event.metadata
        })),
        shift_info: {
          id: shift.id,
          name: shift.shift_name,
          shift_number: shift.shift_number,
          start_time: shift.start_time,
          end_time: shift.end_time,
          status: shift.status
        },
        assets_summary: this.generateAssetsSummaryForAnalytics(events, allAssets)
      };
      
      const analyticsSummary = analyticsSummaryService.generateAnalyticsSummary(archivedData, {
        includeDetailed: true,
        includeRecommendations: true
      });
      
      const reports = {};

      // Generate CSV report with analytics
      if (options.includeCsv !== false) {
        reports.csv = await this.generateEnhancedCsvReport(reportData, analyticsSummary);
      }

      // Generate HTML report with analytics
      if (options.includeHtml !== false) {
        reports.html = this.generateEnhancedHtmlReport(reportData, analyticsSummary);
      }

      // Generate detailed analysis (enhanced)
      if (options.includeAnalysis !== false) {
        reports.analysis = this.generateEnhancedDetailedAnalysis(reportData, analyticsSummary);
      }

      return {
        shift: reportData.shift,
        reports,
        metrics: reportData.metrics,
        assets: reportData.assets,
        analyticsSummary // Include the new analytics summary
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
      // Handle Sequelize model instances
      const assetData = asset.toJSON ? asset.toJSON() : asset;
      const assetId = assetData.id || assetData._id;
      const assetEvents = eventsByAsset[assetId] || [];
      const metrics = this.calculateAssetMetrics(assetData, assetEvents, shiftStart, shiftEnd);
      
      return {
        asset_id: assetId,
        asset_name: assetData.name,
        pin_number: assetData.pin_number,
        location: assetData.location,
        ...metrics
      };
    });

    // Calculate overall shift metrics with validation
    const totalRuntime = assetMetrics.reduce((sum, asset) => sum + (asset.runtime || 0), 0);
    const totalDowntime = assetMetrics.reduce((sum, asset) => sum + (asset.downtime || 0), 0);
    const totalStops = assetMetrics.reduce((sum, asset) => sum + (asset.stops || 0), 0);
    const totalShortStops = assetMetrics.reduce((sum, asset) => sum + (asset.short_stops || 0), 0);
    const averageAvailability = assetMetrics.length > 0 ? 
      assetMetrics.reduce((sum, asset) => sum + (asset.availability || 0), 0) / assetMetrics.length : 0;

    // Calculate OEE components with validation
    const plannedProductionTime = Math.max(shiftDuration, 1); // Prevent division by zero
    const availability = totalRuntime / plannedProductionTime * 100;
    const performance = 85; // This would be calculated based on actual vs expected production
    const quality = 95; // This would be calculated based on quality metrics
    const oee = (availability * performance * quality) / 10000;

    // Ensure all metrics have valid values with fallbacks
    const safeMetrics = {
      total_runtime: totalRuntime || 0, // ms
      total_downtime: totalDowntime || 0, // ms
      total_stops: totalStops || 0,
      total_short_stops: totalShortStops || 0,
      average_availability: isNaN(averageAvailability) ? 0 : averageAvailability,
      availability_percentage: isNaN(availability) ? 0 : Math.max(0, Math.min(100, availability)),
      performance_percentage: isNaN(performance) ? 0 : Math.max(0, Math.min(100, performance)),
      quality_percentage: isNaN(quality) ? 0 : Math.max(0, Math.min(100, quality)),
      oee_percentage: isNaN(oee) ? 0 : Math.max(0, Math.min(100, oee)),
      // Backward-compatible fields expected by some consumers/UI
      availability: isNaN(availability) ? 0 : Math.max(0, Math.min(100, availability)),
      performance: isNaN(performance) ? 0 : Math.max(0, Math.min(100, performance)),
      quality: isNaN(quality) ? 0 : Math.max(0, Math.min(100, quality)),
      oee: isNaN(oee) ? 0 : Math.max(0, Math.min(100, oee)),
      runtime_minutes: (totalRuntime || 0) / 60000,
      downtime_minutes: (totalDowntime || 0) / 60000,
      shift_duration: shiftDuration, // ms
      planned_production_time: shiftDuration // ms
    };

    return {
      shift: {
        ...shift,
        duration: shiftDuration,
        duration_hours: shiftDuration / (1000 * 60 * 60),
        start_time_formatted: shiftStart.toLocaleString(),
        end_time_formatted: shiftEnd.toLocaleString()
      },
      metrics: safeMetrics,
      assets: assetMetrics,
      events: events.map(event => {
        // Find the asset for this event
        const assetId = event.asset_id || event.asset;
        const asset = assets.find(a => {
          const assetData = a.toJSON ? a.toJSON() : a;
          return (assetData.id || assetData._id) === assetId;
        });
        const assetData = asset ? (asset.toJSON ? asset.toJSON() : asset) : null;
        
        return {
          ...event,
          asset_name: assetData ? assetData.name : (event.asset_name || 'Unknown Asset'),
          timestamp_formatted: new Date(event.timestamp).toLocaleString(),
          state: event.state || event.new_state || event.newState || null,
          duration_minutes: event.duration ? event.duration / 60000 : 0
        };
      })
    };
  }
  
  

  /**
   * Calculate detailed metrics for a single asset
   */
  calculateAssetMetrics(asset, events, shiftStart, shiftEnd) {
    let runtime = 0; // ms
    let downtime = 0; // ms
    let stops = 0;
    let shortStops = 0;
    let longestStop = 0; // ms
    let shortestStop = Infinity; // ms
    let totalStopDuration = 0; // ms

    const microStopThresholdMs = 5 * 60 * 1000; // 5 minutes

    // Sort events by timestamp (ascending)
    const sortedEvents = events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Calculate metrics from events
    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      const nextEvent = sortedEvents[i + 1];

      // Determine event duration in ms
      let eventDuration = event.duration || 0;
      if (!eventDuration || eventDuration <= 0) {
        const start = new Date(event.timestamp);
        const end = nextEvent ? new Date(nextEvent.timestamp) : shiftEnd;
        eventDuration = Math.max(0, end - start);
      }

      // Normalize event types/states
      let isStop = false;
      let isRun = false;
      // Normalize strings to uppercase for robust comparisons
      const typeVal = (event.event_type || '').toString().toUpperCase();
      const stateValRaw = (event.new_state || event.newState || event.state || '').toString();
      const stateVal = stateValRaw.toUpperCase();

      if (typeVal === 'STATE_CHANGE' || typeVal === 'STATE' || typeVal === 'STATECHANGE') {
        if (stateVal === 'STOPPED' || stateVal === 'STOP') isStop = true;
        if (stateVal === 'RUNNING' || stateVal === 'START') isRun = true;
      } else if (typeVal === 'STOP' || stateVal === 'STOPPED' || stateVal === 'STOP') {
        isStop = true;
      } else if (typeVal === 'START' || typeVal === 'RUNNING' || stateVal === 'RUNNING' || stateVal === 'START') {
        isRun = true;
      }

      if (isStop) {
        stops++;
        downtime += eventDuration;
        totalStopDuration += eventDuration;
        if (eventDuration > longestStop) longestStop = eventDuration;
        if (eventDuration < shortestStop) shortestStop = eventDuration;
        if (event.is_short_stop || eventDuration < microStopThresholdMs) {
          shortStops++;
        }
      } else if (isRun) {
        runtime += eventDuration;
      }

      // Fallback: legacy fields
      if (event.runtime) runtime += event.runtime;
      if (event.downtime) downtime += event.downtime;
    }

    const totalTime = runtime + downtime; // ms
    const availability = totalTime > 0 ? (runtime / totalTime) * 100 : 0;
    const averageStopDuration = stops > 0 ? totalStopDuration / stops : 0;

    return {
      runtime, // ms
      downtime, // ms
      stops,
      short_stops: shortStops,
      long_stops: stops - shortStops,
      availability,
      longest_stop: longestStop, // ms
      shortest_stop: shortestStop === Infinity ? 0 : shortestStop, // ms
      average_stop_duration: averageStopDuration, // ms
      current_state: asset.current_state || 'UNKNOWN'
    };
  }

  /**
   * Generate CSV report
   */
  async generateCsvReport(reportData) {
    try {
      // Shift summary CSV with enhanced analytics
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
        // Enhanced Analytics from Database
        mtbf_minutes: reportData.shift.mtbf_minutes || 0,
        mttr_minutes: reportData.shift.mttr_minutes || 0,
        stop_frequency_per_hour: reportData.shift.stop_frequency || 0,
        micro_stops_count: reportData.shift.micro_stops_count || 0,
        micro_stops_time_minutes: reportData.shift.micro_stops_time ? (reportData.shift.micro_stops_time / 60).toFixed(2) : 0,
        micro_stops_percentage: reportData.shift.micro_stops_percentage || 0,
        longest_stop_duration_minutes: reportData.shift.longest_stop_duration ? (reportData.shift.longest_stop_duration / 60).toFixed(2) : 0,
        average_stop_duration_minutes: reportData.shift.average_stop_duration ? (reportData.shift.average_stop_duration / 60).toFixed(2) : 0,
        notes: reportData.shift.notes || ''
      }];

      // Asset details CSV
      const assetDetails = reportData.assets.map(asset => ({
        asset_name: asset.asset_name,
        pin_number: asset.pin_number,
        location: asset.location || '',
        current_state: asset.current_state,
        runtime_minutes: (asset.runtime / 60000).toFixed(2),
        downtime_minutes: (asset.downtime / 60000).toFixed(2),
        availability_percentage: asset.availability.toFixed(2),
        total_stops: asset.stops,
        short_stops: asset.short_stops,
        long_stops: asset.long_stops,
        longest_stop_minutes: (asset.longest_stop / 60000).toFixed(2),
        average_stop_duration_minutes: (asset.average_stop_duration / 60000).toFixed(2)
      }));

      // Events CSV
      const eventDetails = reportData.events.map(event => ({
        timestamp: event.timestamp_formatted,
        asset_name: event.asset_name,
        event_type: event.event_type,
        state: event.state || event.new_state || '',
        duration_minutes: Number(event.duration_minutes || 0).toFixed(2),
        is_short_stop: event.is_short_stop || false,
        note: event.note || ''
      }));

      const shiftSummaryCsv = json2csv(shiftSummary);

      const assetFields = [
        'asset_name',
        'pin_number',
        'location',
        'current_state',
        'runtime_minutes',
        'downtime_minutes',
        'availability_percentage',
        'total_stops',
        'short_stops',
        'long_stops',
        'longest_stop_minutes',
        'average_stop_duration_minutes'
      ];
      const assetCsv = assetDetails.length ? json2csv(assetDetails) : json2csv([], { fields: assetFields });

      const eventFields = [
        'timestamp',
        'asset_name',
        'event_type',
        'state',
        'duration_minutes',
        'is_short_stop',
        'note'
      ];
      const eventCsv = eventDetails.length ? json2csv(eventDetails) : json2csv([], { fields: eventFields });

      const csvReports = {
        shift_summary: shiftSummaryCsv,
        asset_details: assetCsv,
        event_details: eventCsv
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
   * Generate assets summary for analytics processing
   */
  generateAssetsSummaryForAnalytics(events, assets) {
    const assetStats = {};
    
    // Group events by asset
    events.forEach(event => {
      const assetId = event.asset_id;
      const asset = assets.find(a => {
        const assetData = a.toJSON ? a.toJSON() : a;
        return (assetData.id || assetData._id) === assetId;
      });
      const assetData = asset ? (asset.toJSON ? asset.toJSON() : asset) : null;
      const assetName = assetData?.name || event.asset?.name || 'Unknown';
      
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
  }

  /**
   * Generate enhanced CSV report with analytics summary
   */
  async generateEnhancedCsvReport(reportData, analyticsSummary) {
    try {
      // Start with analytics summary header
      let csvContent = `"SHIFT ANALYTICS SUMMARY"\n`;
      csvContent += `"${analyticsSummary.executive_summary}"\n\n`;
      
      // Add key metrics
      csvContent += `"KEY METRICS"\n`;
      csvContent += `"Overall Availability","${analyticsSummary.key_metrics.overallAvailability.toFixed(1)}%"\n`;
      csvContent += `"Total Downtime","${Math.round(analyticsSummary.key_metrics.totalDowntime)} minutes"\n`;
      csvContent += `"Total Events","${analyticsSummary.key_metrics.totalEvents}"\n`;
      csvContent += `"Critical Stops","${analyticsSummary.key_metrics.criticalStops}"\n\n`;
      
      // Add performance insights
      if (analyticsSummary.performance_insights && analyticsSummary.performance_insights.length > 0) {
        csvContent += `"PERFORMANCE INSIGHTS"\n`;
        analyticsSummary.performance_insights.forEach(insight => {
          csvContent += `"${insight}"\n`;
        });
        csvContent += `\n`;
      }
      
      // Add recommendations
      if (analyticsSummary.recommendations && analyticsSummary.recommendations.length > 0) {
        csvContent += `"RECOMMENDATIONS"\n`;
        analyticsSummary.recommendations.forEach(recommendation => {
          csvContent += `"${recommendation}"\n`;
        });
        csvContent += `\n`;
      }
      
      // Generate traditional CSV data
      const originalCsv = await this.generateCsvReport(reportData);
      csvContent += `"DETAILED DATA"\n`;
      csvContent += `"SHIFT SUMMARY"\n`;
      csvContent += originalCsv.shift_summary + '\n\n';
      csvContent += `"ASSET DETAILS"\n`;
      csvContent += originalCsv.asset_details + '\n\n';
      csvContent += `"EVENT DETAILS"\n`;
      csvContent += originalCsv.event_details + '\n';
      
      return csvContent;
    } catch (error) {
      console.error('Error generating enhanced CSV report:', error);
      const originalCsv = await this.generateCsvReport(reportData);
      let fallback = `"DETAILED DATA"\n`;
      fallback += `"SHIFT SUMMARY"\n`;
      fallback += originalCsv.shift_summary + '\n\n';
      fallback += `"ASSET DETAILS"\n`;
      fallback += originalCsv.asset_details + '\n\n';
      fallback += `"EVENT DETAILS"\n`;
      fallback += originalCsv.event_details + '\n';
      return fallback;
    }
  }

  /**
   * Generate enhanced HTML report with analytics summary
   */
  generateEnhancedHtmlReport(reportData, analyticsSummary) {
    try {
      const { shift, metrics, assets } = reportData;
      const shiftDate = new Date(shift.start_time).toLocaleDateString();
      const shiftTime = new Date(shift.start_time).toLocaleTimeString();
      
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Enhanced Shift Report - ${shift.shift_name} - ${shiftDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
            .analytics-summary { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 25px; border-radius: 8px; margin-bottom: 30px; }
            .analytics-summary h2 { margin-top: 0; font-size: 24px; }
            .executive-summary { font-size: 18px; line-height: 1.6; margin-bottom: 20px; }
            .key-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
            .metric-card { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px; text-align: center; }
            .metric-value { font-size: 28px; font-weight: bold; display: block; }
            .metric-label { font-size: 14px; opacity: 0.9; }
            .insights-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .insights-section h3 { color: #495057; margin-top: 0; }
            .insight-item { background: white; padding: 12px; margin: 8px 0; border-left: 4px solid #28a745; border-radius: 4px; }
            .recommendations-section { background: #fff3cd; padding: 20px; border-radius: 8px; border: 1px solid #ffeaa7; }
            .recommendations-section h3 { color: #856404; margin-top: 0; }
            .recommendation-item { background: white; padding: 12px; margin: 8px 0; border-left: 4px solid #ffc107; border-radius: 4px; }
            .traditional-data { margin-top: 30px; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
            .metric-box { background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; }
            .asset-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .asset-table th, .asset-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
            .asset-table th { background-color: #007bff; color: white; }
            .asset-table tr:hover { background-color: #f8f9fa; }
            .availability-excellent { color: #28a745; font-weight: bold; }
            .availability-good { color: #ffc107; font-weight: bold; }
            .availability-poor { color: #dc3545; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Enhanced Shift Report</h1>
              <h2>${shift.shift_name}</h2>
              <p><strong>Date:</strong> ${shiftDate} | <strong>Time:</strong> ${shiftTime}</p>
            </div>
            
            <div class="analytics-summary">
              <h2>📊 Analytics Summary</h2>
              <div class="executive-summary">
                ${analyticsSummary.executive_summary}
              </div>
              
              <div class="key-metrics">
                <div class="metric-card">
                  <span class="metric-value">${analyticsSummary.key_metrics.overallAvailability.toFixed(1)}%</span>
                  <span class="metric-label">Overall Availability</span>
                </div>
                <div class="metric-card">
                  <span class="metric-value">${Math.round(analyticsSummary.key_metrics.totalDowntime)}</span>
                  <span class="metric-label">Total Downtime (min)</span>
                </div>
                <div class="metric-card">
                  <span class="metric-value">${shift.mtbf_minutes || 0}</span>
                  <span class="metric-label">MTBF (min)</span>
                </div>
                <div class="metric-card">
                  <span class="metric-value">${shift.mttr_minutes || 0}</span>
                  <span class="metric-label">MTTR (min)</span>
                </div>
                <div class="metric-card">
                  <span class="metric-value">${shift.stop_frequency || 0}</span>
                  <span class="metric-label">Stop Frequency (/hr)</span>
                </div>
                <div class="metric-card">
                  <span class="metric-value">${shift.micro_stops_count || 0}</span>
                  <span class="metric-label">Micro Stops</span>
                </div>
                <div class="metric-card">
                  <span class="metric-value">${analyticsSummary.key_metrics.totalEvents}</span>
                  <span class="metric-label">Total Events</span>
                </div>
                <div class="metric-card">
                  <span class="metric-value">${analyticsSummary.key_metrics.criticalStops}</span>
                  <span class="metric-label">Critical Stops</span>
                </div>
              </div>
            </div>`;
      
      // Add performance insights
      if (analyticsSummary.performance_insights && analyticsSummary.performance_insights.length > 0) {
        html += `
            <div class="insights-section">
              <h3>🔍 Performance Insights</h3>`;
        analyticsSummary.performance_insights.forEach(insight => {
          html += `<div class="insight-item">${insight}</div>`;
        });
        html += `</div>`;
      }
      
      // Add recommendations
      if (analyticsSummary.recommendations && analyticsSummary.recommendations.length > 0) {
        html += `
            <div class="recommendations-section">
              <h3>💡 Recommendations</h3>`;
        analyticsSummary.recommendations.forEach(recommendation => {
          html += `<div class="recommendation-item">${recommendation}</div>`;
        });
        html += `</div>`;
      }
      
      // Add enhanced analytics section
      html += `
            <div class="insights-section">
              <h3>📊 Enhanced Analytics</h3>
              <div class="metrics-grid">
                <div class="metric-box">
                  <h4>Mean Time Between Failures (MTBF)</h4>
                  <p><strong>${shift.mtbf_minutes || 0} minutes</strong></p>
                  <small>Average time between equipment failures</small>
                </div>
                <div class="metric-box">
                  <h4>Mean Time To Repair (MTTR)</h4>
                  <p><strong>${shift.mttr_minutes || 0} minutes</strong></p>
                  <small>Average time to resolve failures</small>
                </div>
                <div class="metric-box">
                  <h4>Stop Frequency</h4>
                  <p><strong>${shift.stop_frequency || 0} stops/hour</strong></p>
                  <small>Frequency of production stops</small>
                </div>
                <div class="metric-box">
                  <h4>Micro Stops</h4>
                  <p><strong>Count:</strong> ${shift.micro_stops_count || 0}</p>
                  <p><strong>Total Time:</strong> ${shift.micro_stops_total_time || 0} min</p>
                  <p><strong>Percentage:</strong> ${shift.micro_stops_percentage || 0}%</p>
                  <small>Brief interruptions in production</small>
                </div>
                <div class="metric-box">
                  <h4>Stop Duration Analysis</h4>
                  <p><strong>Longest Stop:</strong> ${shift.longest_stop_duration || 0} min</p>
                  <p><strong>Average Stop:</strong> ${shift.average_stop_duration || 0} min</p>
                  <small>Duration analysis of production stops</small>
                </div>
              </div>
            </div>`;
      
      // Add traditional report data
      const originalHtml = this.generateHtmlReport(reportData);
      const traditionalDataMatch = originalHtml.match(/<div class="metrics-grid">[\s\S]*<\/body>/i);
      if (traditionalDataMatch) {
        html += `
            <div class="traditional-data">
              <h2>📈 Detailed Metrics</h2>
              ${traditionalDataMatch[0].replace('</body>', '')}`;
      }
      
      html += `
          </div>
        </body>
        </html>`;
      
      return html;
    } catch (error) {
      console.error('Error generating enhanced HTML report:', error);
      return this.generateHtmlReport(reportData); // Fallback to original
    }
  }

  /**
   * Generate enhanced detailed analysis with analytics summary
   */
  generateEnhancedDetailedAnalysis(reportData, analyticsSummary) {
    try {
      const originalAnalysis = this.generateDetailedAnalysis(reportData);
      
      const enhancedAnalysis = {
        analytics_summary: {
          executive_summary: analyticsSummary.executive_summary,
          key_metrics: analyticsSummary.key_metrics,
          performance_level: analyticsSummaryService.getPerformanceLevel(analyticsSummary.key_metrics.overallAvailability)
        },
        detailed_insights: analyticsSummary.detailed_summary,
        performance_insights: analyticsSummary.performance_insights,
        actionable_recommendations: analyticsSummary.recommendations,
        traditional_analysis: originalAnalysis,
        generated_at: analyticsSummary.timestamp
      };
      
      return enhancedAnalysis;
    } catch (error) {
      console.error('Error generating enhanced detailed analysis:', error);
      return this.generateDetailedAnalysis(reportData); // Fallback to original
    }
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
        const filename = this.generateEnhancedFilename(report.shift.shift_name || report.shift.name, report.shift.start_time, 'csv');
        const filePath = path.join(process.cwd(), 'reports', filename);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, csvBuffer);
        savedFiles.csv = filePath;
      }

      // Send email if recipients provided
      if (recipients && recipients.length > 0) {
        // Prepare attachments array
        const attachments = [];
        
        // Add CSV file as attachment if it exists
        if (savedFiles.csv) {
          attachments.push({
            filename: path.basename(savedFiles.csv),
            path: savedFiles.csv
          });
        }
        
        await sendEmail({
          to: recipients,
          subject: `Shift Report - ${report.shift.shift_name || report.shift.name}`,
          text: 'Please find the attached shift report.',
          html: report.reports.html || '<p>Shift report attached.</p>',
          attachments: attachments
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

  /**
   * Generate report from archived data and store in Shift Reports Archive
   */
  async generateAndArchiveShiftReport(archiveId, options = {}) {
    try {
      console.log('📊 Generating report from archived data, archive ID:', archiveId);
      
      // Get the archived data
      const archive = await this.databaseService.findArchiveById(archiveId);
      if (!archive || !archive.archived_data) {
        throw new Error('Archive not found or contains no data');
      }
      
      const archivedData = archive.archived_data;
      const events = archivedData.events || [];
      const shiftInfo = archivedData.shift_info || {};
      
      // Get current assets for reference (archived events may reference deleted assets)
      const allAssets = await this.databaseService.getAllAssets();
      
      // Create a mock shift object from archived data
      const mockShift = {
        id: shiftInfo.id,
        shift_name: shiftInfo.name,
        shift_number: shiftInfo.shift_number,
        start_time: shiftInfo.start_time,
        end_time: shiftInfo.end_time,
        status: shiftInfo.status || 'COMPLETED'
      };
      
      // Calculate metrics from archived events
      const reportData = this.calculateShiftMetrics(mockShift, events, allAssets);
      
      // Add archived data context
      reportData.dataSource = {
        type: 'archived',
        archive_id: archiveId,
        archive_title: archive.title,
        archived_at: archive.created_at,
        data_integrity: archivedData.archiving_metadata?.data_integrity_verified || false
      };
      
      const reports = {};
      
      // Generate all report formats
      if (options.includeCsv !== false) {
        reports.csv = await this.generateCsvReport(reportData);
      }
      
      if (options.includeHtml !== false) {
        reports.html = this.generateHtmlReport(reportData);
      }
      
      if (options.includeAnalysis !== false) {
        reports.analysis = this.generateDetailedAnalysis(reportData);
      }
      
      // Create report archive entry
      const reportArchiveData = {
        title: `Shift Report - ${archive.title}`,
        description: `Generated shift report from archived data - ${events.length} events analyzed`,
        archive_type: 'SHIFT_REPORT',
        date_range_start: mockShift.start_time,
        date_range_end: mockShift.end_time,
        created_by: 1, // System user
        status: 'COMPLETED',
        archived_data: {
          source_archive_id: archiveId,
          report_generation_timestamp: new Date().toISOString(),
          report_formats: Object.keys(reports),
          shift_metrics: reportData.metrics,
          // ... existing code ...
          asset_performance: (reportData.assets || []).map(a => ({
            ...a,
            name: a.asset_name,
            runtime_minutes: Math.round(((a.runtime || 0) / 60000)),
            downtime_minutes: Math.round(((a.downtime || 0) / 60000)),
            stop_count: a.stops
          })),
          reports: reports,
          generation_metadata: {
            events_processed: events.length,
            assets_analyzed: reportData.assets?.length || 0,
            report_version: '2.0',
            data_source: 'archived_events'
          }
        }
      };
      
      // Store the report in archives
      const reportArchive = await this.databaseService.createArchive(reportArchiveData);
      
      console.log('📊 Shift report archived successfully:', reportArchive?.id);
      
      return {
        success: true,
        reportArchive,
        reports,
        metrics: reportData.metrics
      };
      
    } catch (error) {
      console.error('❌ Failed to generate and archive shift report:', error.message);
      throw error;
    }
  }

  /**
   * Generate report directly from shift ID and archive it
   */
  async generateAndArchiveShiftReportFromShift(shiftId, options = {}) {
    try {
      console.log('📊 Generating and archiving report for shift ID:', shiftId);
      
      // Generate the standard report
      const reportResult = await this.generateShiftReport(shiftId, options);
      
      // Get shift information
      const shift = await this.databaseService.findShiftById(shiftId);
      if (!shift) {
        throw new Error('Shift not found');
      }
      
      // Create report archive entry
      const reportArchiveData = {
        title: `Shift Report - ${shift.shift_name || `Shift ${shift.shift_number}`} - ${new Date(shift.start_time).toLocaleDateString()}`,
        description: `Generated shift report - Direct from shift data`,
        archive_type: 'SHIFT_REPORT',
        date_range_start: shift.start_time,
        date_range_end: shift.end_time,
        created_by: 1, // System user
        status: 'COMPLETED',
        archived_data: {
          shift_id: shiftId,
          report_generation_timestamp: new Date().toISOString(),
          report_formats: Object.keys(reportResult.reports || {}),
          shift_metrics: reportResult.metrics,
          asset_performance: (reportResult.assets || []).map(a => ({
            asset_id: a.asset_id || a.id,
            name: a.asset_name || a.name || 'Unknown Asset',
            pin_number: a.pin_number || null,
            location: a.location || null,
            runtime_minutes: Math.round(((a.runtime || 0) / 60000)),
            downtime_minutes: Math.round(((a.downtime || 0) / 60000)),
            stop_count: a.stops || 0,
            short_stop_count: a.short_stops || 0,
            availability: isNaN(a.availability) ? 0 : Math.max(0, Math.min(100, a.availability || 0)),
            longest_stop_minutes: a.longest_stop ? Math.round(a.longest_stop / 60000) : 0,
            average_stop_minutes: a.average_stop_duration ? Math.round(a.average_stop_duration / 60000) : 0,
            total_time_minutes: Math.round(((a.runtime || 0) + (a.downtime || 0)) / 60000)
          })),
          reports: reportResult.reports,
          generation_metadata: {
            events_processed: reportResult.events?.length || 0,
            assets_analyzed: reportResult.assets?.length || 0,
            report_version: '2.0',
            data_source: 'live_shift_data',
            generation_timestamp: new Date().toISOString(),
            shift_duration_ms: shift.end_time ? new Date(shift.end_time) - new Date(shift.start_time) : 0,
            analytics_summary_available: !!reportResult.analyticsSummary,
            total_events_from_analytics: reportResult.analyticsSummary?.key_metrics?.totalEvents || 0
          }
        }
      };
      
      // Store the report in archives
      const reportArchive = await this.databaseService.createArchive(reportArchiveData);
      
      console.log('📊 Shift report archived successfully:', reportArchive?.id);
      
      return {
        success: true,
        reportArchive,
        reports: reportResult.reports,
        metrics: reportResult.metrics
      };
      
    } catch (error) {
      console.error('❌ Failed to generate and archive shift report from shift:', error.message);
      throw error;
    }
  }

  /**
   * Calculate enhanced analytics for shift storage
   * @param {Object} shift - Shift record
   * @param {Array} events - Shift events
   * @param {Array} assets - All assets
   * @returns {Object} Enhanced analytics values for database storage
   */
  calculateEnhancedAnalyticsForStorage(shift, events, assets) {
    try {
      const shiftStart = new Date(shift.start_time);
      const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
      const shiftDurationHours = (shiftEnd - shiftStart) / (1000 * 60 * 60);
      
      // Filter stop events
      const stopEvents = events.filter(e => 
        e.event_type === 'STATE_CHANGE' && e.new_state === 'STOPPED'
      );
      
      const totalStops = stopEvents.length;
      
      // Calculate stop durations (ms)
      const stopDurations = stopEvents.map(e => e.duration || 0).filter(d => d > 0);
      const totalStopTime = stopDurations.reduce((sum, duration) => sum + duration, 0);
      
      // Micro stops (< 5 minutes)
      const microStops = stopDurations.filter(duration => duration < 5 * 60 * 1000);
      const microStopsTime = microStops.reduce((sum, duration) => sum + duration, 0);
      
      // Calculate MTBF and MTTR (minutes)
      const totalRuntime = events
        .filter(e => e.event_type === 'STATE_CHANGE' && e.new_state === 'RUNNING')
        .reduce((sum, e) => sum + (e.duration || 0), 0);
      
      const mtbfMinutes = totalStops > 0 ? (totalRuntime / 1000 / 60) / totalStops : 0;
      const mttrMinutes = totalStops > 0 ? (totalStopTime / 1000 / 60) / totalStops : 0;
      
      // Stop frequency (stops per hour)
      const stopFrequency = shiftDurationHours > 0 ? totalStops / shiftDurationHours : 0;
      
      // Micro stops percentage
      const microStopsPercentage = totalStopTime > 0 ? (microStopsTime / totalStopTime) * 100 : 0;
      
      // Longest and average stop duration (ms)
      const longestStopDuration = stopDurations.length > 0 ? Math.max(...stopDurations) : 0;
      const averageStopDuration = stopDurations.length > 0 ? 
        stopDurations.reduce((sum, d) => sum + d, 0) / stopDurations.length : 0;
      
      return {
        mtbf_minutes: parseFloat(mtbfMinutes.toFixed(2)),
        mttr_minutes: parseFloat(mttrMinutes.toFixed(2)),
        stop_frequency: parseFloat(stopFrequency.toFixed(2)),
        micro_stops_count: microStops.length,
        micro_stops_time: microStopsTime,
        micro_stops_percentage: parseFloat(microStopsPercentage.toFixed(2)),
        longest_stop_duration: longestStopDuration,
        average_stop_duration: parseFloat(averageStopDuration.toFixed(2))
      };
    } catch (error) {
      console.error('❌ Error calculating enhanced analytics:', error.message);
      return {
        mtbf_minutes: 0,
        mttr_minutes: 0,
        stop_frequency: 0,
        micro_stops_count: 0,
        micro_stops_time: 0,
        micro_stops_percentage: 0,
        longest_stop_duration: 0,
        average_stop_duration: 0
      };
    }
  }

  /**
   * Get all archived shift reports
   */
  async getArchivedShiftReports(options = {}) {
    try {
      const allArchives = await this.databaseService.getAllArchives();
      
      // Filter for shift reports only
      let shiftReports = allArchives.filter(archive => 
        archive.archive_type === 'SHIFT_REPORT'
      );
      
      // Apply date filtering if provided
      if (options.startDate && options.endDate) {
        const startDate = new Date(options.startDate);
        const endDate = new Date(options.endDate);
        
        shiftReports = shiftReports.filter(report => {
          const reportDate = new Date(report.created_at);
          return reportDate >= startDate && reportDate <= endDate;
        });
      }
      
      // Sort by creation date, newest first
      shiftReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return shiftReports;
    } catch (error) {
      console.error('❌ Failed to get archived shift reports:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve a specific archived shift report
   */
  async getArchivedShiftReport(reportArchiveId) {
    try {
      const archive = await this.databaseService.findArchiveById(reportArchiveId);
      
      if (!archive || archive.archive_type !== 'SHIFT_REPORT') {
        throw new Error('Shift report archive not found');
      }
      
      return archive;
    } catch (error) {
      console.error('❌ Failed to get archived shift report:', error.message);
      throw error;
    }
  }
}

module.exports = new ReportService();