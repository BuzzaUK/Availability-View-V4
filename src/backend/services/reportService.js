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
      console.log('🔍 generateShiftReport: Starting for shift ID:', shiftId);
      
      const shift = await this.databaseService.findShiftById(shiftId);
      console.log('🔍 generateShiftReport: Found shift:', shift ? 'YES' : 'NO');

      if (!shift) {
        throw new Error('Shift not found');
      }

      // Get events for this shift using shift_id for consistency with archives
      const allEvents = await this.databaseService.getAllEvents();
      const allEventsArray = allEvents.rows || allEvents; // handle findAndCountAll vs findAll
      console.log('🔍 generateShiftReport: Total events found:', allEventsArray.length);
      
      // Filter events by shift_id for consistency with archive filtering
      // This ensures reports and archives show the same data
      const events = allEventsArray.filter(event => {
        return event.shift_id === shiftId;
      });
      console.log('🔍 generateShiftReport: Events for this shift:', events.length);

      // Get all assets
      const allAssets = await this.databaseService.getAllAssets();
      console.log('🔍 generateShiftReport: Total assets found:', allAssets.length);

      console.log('🔍 generateShiftReport: About to calculate shift metrics...');
      let reportData;
      try {
        reportData = this.calculateShiftMetrics(shift, events, allAssets);
        console.log('✅ generateShiftReport: calculateShiftMetrics completed');
      } catch (metricsError) {
        console.error('❌ generateShiftReport: Error in calculateShiftMetrics:', metricsError.message);
        console.error('Stack trace:', metricsError.stack);
        throw metricsError;
      }
      
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
        try {
          console.log('🔍 generateShiftReport: Generating CSV report...');
          reports.csv = await this.generateEnhancedCsvReport(reportData, analyticsSummary);
          console.log('✅ generateShiftReport: CSV report generated');
        } catch (csvError) {
          console.error('❌ generateShiftReport: Error in generateEnhancedCsvReport:', csvError.message);
          console.error('Stack trace:', csvError.stack);
          throw csvError;
        }
      }

      // Generate HTML report with analytics
      if (options.includeHtml !== false) {
        try {
          console.log('🔍 generateShiftReport: Generating HTML report...');
          reports.html = this.generateEnhancedHtmlReport(reportData, analyticsSummary);
          console.log('✅ generateShiftReport: HTML report generated');
        } catch (htmlError) {
          console.error('❌ generateShiftReport: Error in generateEnhancedHtmlReport:', htmlError.message);
          console.error('Stack trace:', htmlError.stack);
          throw htmlError;
        }
      }

      // Generate detailed analysis (enhanced)
      if (options.includeAnalysis !== false) {
        try {
          console.log('🔍 generateShiftReport: Generating detailed analysis...');
          reports.analysis = this.generateEnhancedDetailedAnalysis(reportData, analyticsSummary);
          console.log('✅ generateShiftReport: Detailed analysis generated');
        } catch (analysisError) {
          console.error('❌ generateShiftReport: Error in generateEnhancedDetailedAnalysis:', analysisError.message);
          console.error('Stack trace:', analysisError.stack);
          throw analysisError;
        }
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

    // Calculate availability metrics only
    const plannedProductionTime = Math.max(shiftDuration, 1); // Prevent division by zero
    const availability = totalRuntime / plannedProductionTime * 100;

    // Ensure all metrics have valid values with fallbacks - availability tracking only
    const safeMetrics = {
      total_runtime: totalRuntime || 0, // ms
      total_downtime: totalDowntime || 0, // ms
      total_stops: totalStops || 0,
      total_short_stops: totalShortStops || 0,
      average_availability: isNaN(averageAvailability) ? 0 : averageAvailability,
      availability_percentage: isNaN(availability) ? 0 : Math.max(0, Math.min(100, availability)),
      // Add missing OEE percentage field to prevent toFixed() errors
      oee_percentage: isNaN(availability) ? 0 : Math.max(0, Math.min(100, availability)),
      // Backward-compatible fields expected by some consumers/UI
      availability: isNaN(availability) ? 0 : Math.max(0, Math.min(100, availability)),
      runtime_minutes: (totalRuntime || 0) / 60000,
      downtime_minutes: (totalDowntime || 0) / 60000,
      shift_duration: shiftDuration, // ms
      planned_production_time: shiftDuration // ms
    };

    // Convert Sequelize model to plain object
    const shiftData = shift.toJSON ? shift.toJSON() : shift;
    
    return {
      shift: {
        ...shiftData,
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

      // Normalize event types/states - Updated for corrected timing logic
      let isStop = false;
      let isRun = false;
      // Normalize strings to uppercase for robust comparisons
      const typeVal = (event.event_type || '').toString().toUpperCase();
      const stateValRaw = (event.new_state || event.newState || event.state || '').toString();
      const stateVal = stateValRaw.toUpperCase();

      // Handle new timing-corrected event types
      if (typeVal === 'RUN_END') {
        isRun = true; // RUN_END events contain the duration of the run that just ended
      } else if (typeVal === 'STOP_END') {
        isStop = true; // STOP_END events contain the duration of the stop that just ended
      } else if (typeVal === 'STATE_CHANGE' || typeVal === 'STATE' || typeVal === 'STATECHANGE') {
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
        // Check for micro stops using both the stop_reason field and duration threshold
        const isMicroStop = (event.stop_reason && event.stop_reason.includes('Short')) || 
                           event.is_short_stop || 
                           eventDuration <= 300000; // 300 seconds = 5 minutes
        if (isMicroStop) {
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
        shift_number: reportData.shift?.shift_number || 0,
        shift_name: reportData.shift?.name || 'Unknown',
        start_time: reportData.shift?.start_time_formatted || '',
        end_time: reportData.shift?.end_time_formatted || '',
        duration_hours: ((reportData.shift?.duration_hours || 0)).toFixed(2),
        total_runtime_minutes: ((reportData.metrics?.total_runtime || 0) / 60000).toFixed(2),
        total_downtime_minutes: ((reportData.metrics?.total_downtime || 0) / 60000).toFixed(2),
        total_stops: reportData.metrics?.total_stops || 0,
        average_availability: ((reportData.metrics?.average_availability || 0)).toFixed(2),
        oee_percentage: ((reportData.metrics?.oee_percentage || 0)).toFixed(2),
        // Enhanced Analytics from Database
        mtbf_minutes: reportData.shift?.mtbf_minutes || 0,
        mttr_minutes: reportData.shift?.mttr_minutes || 0,
        stop_frequency_per_hour: reportData.shift?.stop_frequency || 0,
        micro_stops_count: reportData.shift?.micro_stops_count || 0,
        micro_stops_time_minutes: reportData.shift?.micro_stops_time ? ((reportData.shift.micro_stops_time || 0) / 60).toFixed(2) : 0,
        micro_stops_percentage: reportData.shift?.micro_stops_percentage || 0,
        longest_stop_duration_minutes: reportData.shift?.longest_stop_duration ? ((reportData.shift.longest_stop_duration || 0) / 60).toFixed(2) : 0,
        average_stop_duration_minutes: reportData.shift?.average_stop_duration ? ((reportData.shift.average_stop_duration || 0) / 60).toFixed(2) : 0,
        notes: reportData.shift?.notes || ''
      }];

      // Asset details CSV
      const assetDetails = (reportData.assets || []).map(asset => ({
        asset_name: asset.asset_name,
        pin_number: asset.pin_number,
        location: asset.location || '',
        current_state: asset.current_state,
        runtime_minutes: (((asset.runtime || 0)) / 60000).toFixed(2),
        downtime_minutes: (((asset.downtime || 0)) / 60000).toFixed(2),
        availability_percentage: ((asset.availability || 0)).toFixed(2),
        total_stops: asset.stops || 0,
        short_stops: asset.short_stops || 0,
        long_stops: asset.long_stops || 0,
        longest_stop_minutes: (((asset.longest_stop || 0)) / 60000).toFixed(2),
        average_stop_duration_minutes: (((asset.average_stop_duration || 0)) / 60000).toFixed(2)
      }));

      // Events CSV
      const eventDetails = (reportData.events || []).map(event => ({
        timestamp: event.timestamp_formatted,
        asset_name: event.asset_name,
        event_type: event.event_type,
        state: event.state || event.new_state || '',
        duration_minutes: (Number(event.duration_minutes || 0)).toFixed(2),
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
            <p><strong>Duration:</strong> ${((shift.duration_hours || 0)).toFixed(2)} hours</p>
            ${shift.notes ? `<p><strong>Notes:</strong> ${shift.notes}</p>` : ''}
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value">${((metrics.average_availability || 0)).toFixed(1)}%</div>
                <div class="metric-label">Average Availability</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((metrics.total_runtime || 0) / 60000).toFixed(1)}</div>
                <div class="metric-label">Total Runtime (min)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((metrics.total_downtime || 0) / 60000).toFixed(1)}</div>
                <div class="metric-label">Total Downtime (min)</div>
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
                    <td>${(((asset.runtime || 0)) / 60).toFixed(1)}</td>
                    <td>${(((asset.downtime || 0)) / 60).toFixed(1)}</td>
                    <td class="${availabilityClass}">${((asset.availability || 0)).toFixed(1)}%</td>
                    <td>${asset.stops || 0}</td>
                    <td>${(((asset.average_stop_duration || 0)) / 60).toFixed(1)}</td>
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
      csvContent += `"Overall Availability","${((analyticsSummary.key_metrics?.overallAvailability || 0)).toFixed(1)}%"\n`;
      csvContent += `"Total Downtime","${Math.round(analyticsSummary.key_metrics?.totalDowntime || 0)} minutes"\n`;
      csvContent += `"Total Events","${analyticsSummary.key_metrics?.totalEvents || 0}"\n`;
      csvContent += `"Critical Stops","${analyticsSummary.key_metrics?.criticalStops || 0}"\n\n`;
      
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
      const shiftDuration = Math.round((new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60 * 10)) / 10;
      const performanceColor = analyticsSummary.key_metrics.overallAvailability >= 90 ? '#28a745' : 
                              analyticsSummary.key_metrics.overallAvailability >= 75 ? '#ffc107' : '#dc3545';
      
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Enhanced Shift Report - ${shift.shift_name} - ${shiftDate}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              min-height: 100vh;
            }
            .container { 
              max-width: 1200px; 
              margin: 0 auto; 
              background: white; 
              padding: 40px; 
              border-radius: 16px; 
              box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            
            /* Mobile Responsive Styles */
            @media (max-width: 768px) {
              body { padding: 10px; }
              .container { padding: 20px; }
              .header h1 { font-size: 24px; }
              .header h2 { font-size: 20px; }
              .key-metrics { grid-template-columns: 1fr 1fr; gap: 12px; }
              .metrics-grid { grid-template-columns: 1fr; }
              .metric-card { padding: 16px; }
              .metric-value { font-size: 24px; }
              .asset-table { font-size: 14px; }
              .asset-table th, .asset-table td { padding: 8px; }
            }
            
            @media (max-width: 480px) {
              .key-metrics { grid-template-columns: 1fr; }
              .metric-value { font-size: 20px; }
            }
            
            .header { 
              text-align: center; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px;
              border-radius: 12px;
              margin-bottom: 40px;
              box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
            }
            .header h1 { 
              margin: 0 0 15px 0; 
              font-size: 32px; 
              font-weight: 700;
            }
            .header h2 { 
              margin: 0 0 20px 0; 
              font-size: 24px; 
              font-weight: 500;
              opacity: 0.9;
            }
            .header-icon { 
              font-size: 48px; 
              margin-bottom: 15px; 
              display: block;
            }
            
            .analytics-summary { 
              background: linear-gradient(135deg, #007bff, #0056b3); 
              color: white; 
              padding: 35px; 
              border-radius: 16px; 
              margin-bottom: 40px;
              box-shadow: 0 6px 24px rgba(0, 123, 255, 0.3);
            }
            .analytics-summary h2 { 
              margin: 0 0 25px 0; 
              font-size: 28px; 
              font-weight: 700;
              display: flex;
              align-items: center;
            }
            .analytics-summary h2::before {
              content: '📊';
              font-size: 36px;
              margin-right: 15px;
            }
            .executive-summary { 
              font-size: 16px; 
              line-height: 1.7; 
              margin-bottom: 30px;
              background: rgba(255,255,255,0.15);
              padding: 20px;
              border-radius: 10px;
              border-left: 4px solid #ffc107;
            }
            .executive-summary::before {
              content: '📋';
              font-size: 24px;
              margin-right: 10px;
              display: inline-block;
            }
            
            .key-metrics { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
              gap: 20px; 
              margin-bottom: 30px; 
            }
            .metric-card { 
              background: rgba(255,255,255,0.95); 
              padding: 24px; 
              border-radius: 12px; 
              text-align: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              border: 2px solid transparent;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
              position: relative;
              overflow: hidden;
            }
            .metric-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            }
            .metric-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: var(--card-color, #007bff);
            }
            .metric-card.availability { --card-color: ${performanceColor}; }
            .metric-card.downtime { --card-color: #dc3545; }
            .metric-card.events { --card-color: #007bff; }
            .metric-card.critical { --card-color: #ffc107; }
            .metric-card.mtbf { --card-color: #17a2b8; }
            .metric-card.mttr { --card-color: #6f42c1; }
            .metric-card.frequency { --card-color: #fd7e14; }
            .metric-card.micro { --card-color: #20c997; }
            
            .metric-icon {
              font-size: 32px;
              margin-bottom: 12px;
              display: block;
            }
            .metric-value { 
              font-size: 32px; 
              font-weight: 700; 
              display: block;
              color: var(--card-color, #007bff);
              margin-bottom: 8px;
              line-height: 1;
            }
            .metric-label { 
              font-size: 13px; 
              color: #495057;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .metric-sublabel {
              font-size: 11px;
              color: #6c757d;
              margin-top: 6px;
            }
            
            .insights-section { 
              background: white; 
              padding: 30px; 
              border-radius: 16px; 
              margin-bottom: 30px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.08);
              border-top: 4px solid #28a745;
            }
            .insights-section h3 { 
              color: #495057; 
              margin: 0 0 25px 0;
              font-size: 24px;
              font-weight: 600;
              display: flex;
              align-items: center;
            }
            .insights-section h3::before {
              content: '🔍';
              font-size: 28px;
              margin-right: 12px;
            }
            .insight-item { 
              background: linear-gradient(135deg, #e8f5e8, #f0f9f0); 
              padding: 18px; 
              margin: 15px 0; 
              border-left: 5px solid #28a745; 
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(40,167,69,0.1);
              display: flex;
              align-items: flex-start;
            }
            .insight-item::before {
              content: counter(insight-counter);
              counter-increment: insight-counter;
              background: #28a745;
              color: white;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              margin-right: 15px;
              flex-shrink: 0;
            }
            .insights-section { counter-reset: insight-counter; }
            
            .recommendations-section { 
              background: linear-gradient(135deg, #fff3cd, #fef9e7); 
              padding: 30px; 
              border-radius: 16px; 
              border: 2px solid #ffeaa7;
              box-shadow: 0 4px 16px rgba(255,193,7,0.2);
              border-top: 4px solid #ffc107;
              margin-bottom: 30px;
            }
            .recommendations-section h3 { 
              color: #856404; 
              margin: 0 0 25px 0;
              font-size: 24px;
              font-weight: 600;
              display: flex;
              align-items: center;
            }
            .recommendations-section h3::before {
              content: '💡';
              font-size: 28px;
              margin-right: 12px;
            }
            .recommendation-item { 
              background: white; 
              padding: 20px; 
              margin: 15px 0; 
              border-left: 5px solid #ffc107; 
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(255,193,7,0.15);
            }
            .recommendation-item::before {
              content: '💡';
              font-size: 18px;
              margin-right: 10px;
              opacity: 0.7;
            }
            
            .traditional-data { 
              margin-top: 40px; 
            }
            .section-title {
              font-size: 28px;
              font-weight: 700;
              color: #495057;
              margin-bottom: 30px;
              display: flex;
              align-items: center;
              padding-bottom: 15px;
              border-bottom: 3px solid #007bff;
            }
            .section-title::before {
              font-size: 32px;
              margin-right: 15px;
            }
            
            .metrics-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
              gap: 25px; 
              margin: 30px 0; 
            }
            .metric-box { 
              background: white; 
              padding: 25px; 
              border-radius: 12px; 
              border: 1px solid #e9ecef;
              box-shadow: 0 4px 12px rgba(0,0,0,0.08);
              transition: transform 0.2s ease;
            }
            .metric-box:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(0,0,0,0.12);
            }
            .metric-box h4 {
              color: #495057;
              margin: 0 0 15px 0;
              font-size: 18px;
              font-weight: 600;
              display: flex;
              align-items: center;
            }
            .metric-box h4::before {
              font-size: 20px;
              margin-right: 8px;
            }
            
            .asset-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 25px;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            .asset-table th, .asset-table td { 
              padding: 16px; 
              text-align: left; 
              border-bottom: 1px solid #e9ecef; 
            }
            .asset-table th { 
              background: linear-gradient(135deg, #007bff, #0056b3); 
              color: white;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.5px;
            }
            .asset-table tr:hover { 
              background-color: #f8f9fa; 
            }
            .asset-table tr:last-child td {
              border-bottom: none;
            }
            
            .availability-excellent { color: #28a745; font-weight: bold; }
            .availability-good { color: #ffc107; font-weight: bold; }
            .availability-poor { color: #dc3545; font-weight: bold; }
            
            .status-badge {
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-excellent { background: #d4edda; color: #155724; }
            .status-good { background: #fff3cd; color: #856404; }
            .status-poor { background: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="header-icon">🏭</span>
              <h1>Enhanced Shift Report</h1>
              <h2>${shift.shift_name}</h2>
              <p><strong>📅 Date:</strong> ${shiftDate} | <strong>⏰ Duration:</strong> ${shiftDuration} hours</p>
            </div>
            
            <div class="analytics-summary">
              <h2>Analytics Summary</h2>
              <div class="executive-summary">
                ${analyticsSummary.executive_summary}
              </div>
              
              <div class="key-metrics">
                <div class="metric-card availability">
                  <span class="metric-icon">${(analyticsSummary.key_metrics?.overallAvailability || 0) >= 90 ? '🟢' : (analyticsSummary.key_metrics?.overallAvailability || 0) >= 75 ? '🟡' : '🔴'}</span>
                  <span class="metric-value">${((analyticsSummary.key_metrics?.overallAvailability || 0)).toFixed(1)}%</span>
                  <span class="metric-label">Overall Availability</span>
                  <div class="metric-sublabel">${(analyticsSummary.key_metrics?.overallAvailability || 0) >= 90 ? 'Excellent Performance' : (analyticsSummary.key_metrics?.overallAvailability || 0) >= 75 ? 'Good Performance' : 'Needs Attention'}</div>
                </div>
                <div class="metric-card downtime">
                  <span class="metric-icon">⏱️</span>
                  <span class="metric-value">${Math.round(analyticsSummary.key_metrics?.totalDowntime || 0)}</span>
                  <span class="metric-label">Total Downtime (min)</span>
                  <div class="metric-sublabel">${Math.round((analyticsSummary.key_metrics?.totalDowntime || 0) / 60 * 10) / 10} hours</div>
                </div>
                <div class="metric-card mtbf">
                  <span class="metric-icon">🔧</span>
                  <span class="metric-value">${shift.mtbf_minutes || 0}</span>
                  <span class="metric-label">MTBF (min)</span>
                  <div class="metric-sublabel">Mean Time Between Failures</div>
                </div>
                <div class="metric-card mttr">
                  <span class="metric-icon">⚡</span>
                  <span class="metric-value">${shift.mttr_minutes || 0}</span>
                  <span class="metric-label">MTTR (min)</span>
                  <div class="metric-sublabel">Mean Time To Repair</div>
                </div>
                <div class="metric-card frequency">
                  <span class="metric-icon">📊</span>
                  <span class="metric-value">${shift.stop_frequency || 0}</span>
                  <span class="metric-label">Stop Frequency (/hr)</span>
                  <div class="metric-sublabel">Stops per hour</div>
                </div>
                <div class="metric-card micro">
                  <span class="metric-icon">⚡</span>
                  <span class="metric-value">${shift.micro_stops_count || 0}</span>
                  <span class="metric-label">Micro Stops</span>
                  <div class="metric-sublabel">Brief interruptions</div>
                </div>
                <div class="metric-card events">
                  <span class="metric-icon">📈</span>
                  <span class="metric-value">${analyticsSummary.key_metrics?.totalEvents || 0}</span>
                  <span class="metric-label">Total Events</span>
                  <div class="metric-sublabel">Activity Level: ${(analyticsSummary.key_metrics?.totalEvents || 0) > 50 ? 'High' : (analyticsSummary.key_metrics?.totalEvents || 0) > 20 ? 'Medium' : 'Low'}</div>
                </div>
                <div class="metric-card critical">
                  <span class="metric-icon">⚠️</span>
                  <span class="metric-value">${analyticsSummary.key_metrics?.criticalStops || 0}</span>
                  <span class="metric-label">Critical Stops</span>
                  <div class="metric-sublabel">${(analyticsSummary.key_metrics?.criticalStops || 0) === 0 ? 'No Issues' : 'Requires Review'}</div>
                </div>
              </div>
            </div>`;
      
      // Add enhanced performance insights
      if (analyticsSummary.performance_insights && analyticsSummary.performance_insights.length > 0) {
        html += `
            <div class="insights-section">
              <h3>Performance Insights</h3>`;
        analyticsSummary.performance_insights.forEach(insight => {
          html += `<div class="insight-item"><div style="color: #155724; line-height: 1.6; font-size: 15px;">${insight}</div></div>`;
        });
        html += `</div>`;
      }
      
      // Add enhanced recommendations with priority indicators
      if (analyticsSummary.recommendations && analyticsSummary.recommendations.length > 0) {
        html += `
            <div class="recommendations-section">
              <h3>Actionable Recommendations</h3>`;
        analyticsSummary.recommendations.forEach((recommendation, index) => {
          const priorityIcon = index === 0 ? '🔥' : index === 1 ? '⭐' : '📌';
          const priorityLabel = index === 0 ? 'High Priority' : index === 1 ? 'Medium Priority' : 'Standard';
          const priorityColor = index === 0 ? '#dc3545' : index === 1 ? '#ffc107' : '#6c757d';
          html += `
            <div class="recommendation-item">
              <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                <span style="font-size: 18px; margin-right: 8px;">${priorityIcon}</span>
                <span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${priorityLabel}</span>
              </div>
              <div style="color: #856404; line-height: 1.6; font-size: 15px; margin-left: 26px;">${recommendation}</div>
            </div>`;
        });
        html += `</div>`;
      }
      
      // Add enhanced analytics section with better styling
      html += `
            <div class="insights-section">
              <h3 style="display: flex; align-items: center;"><span style="font-size: 28px; margin-right: 12px;">📊</span>Enhanced Analytics</h3>
              <div class="metrics-grid">
                <div class="metric-box">
                  <h4 style="display: flex; align-items: center;"><span style="font-size: 20px; margin-right: 8px;">🔧</span>Mean Time Between Failures</h4>
                  <p style="font-size: 24px; font-weight: 700; color: #17a2b8; margin: 10px 0;">${shift.mtbf_minutes || 0} minutes</p>
                  <small style="color: #6c757d;">Average time between equipment failures</small>
                </div>
                <div class="metric-box">
                  <h4 style="display: flex; align-items: center;"><span style="font-size: 20px; margin-right: 8px;">⚡</span>Mean Time To Repair</h4>
                  <p style="font-size: 24px; font-weight: 700; color: #6f42c1; margin: 10px 0;">${shift.mttr_minutes || 0} minutes</p>
                  <small style="color: #6c757d;">Average time to resolve failures</small>
                </div>
                <div class="metric-box">
                  <h4 style="display: flex; align-items: center;"><span style="font-size: 20px; margin-right: 8px;">📊</span>Stop Frequency</h4>
                  <p style="font-size: 24px; font-weight: 700; color: #fd7e14; margin: 10px 0;">${shift.stop_frequency || 0} /hour</p>
                  <small style="color: #6c757d;">Frequency of production stops</small>
                </div>
                <div class="metric-box">
                  <h4 style="display: flex; align-items: center;"><span style="font-size: 20px; margin-right: 8px;">⚡</span>Micro Stops Analysis</h4>
                  <div style="margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong style="color: #20c997;">Count:</strong> ${shift.micro_stops_count || 0}</p>
                    <p style="margin: 5px 0;"><strong style="color: #20c997;">Total Time:</strong> ${shift.micro_stops_total_time || 0} min</p>
                    <p style="margin: 5px 0;"><strong style="color: #20c997;">Percentage:</strong> ${shift.micro_stops_percentage || 0}%</p>
                  </div>
                  <small style="color: #6c757d;">Brief interruptions in production</small>
                </div>
                <div class="metric-box">
                  <h4 style="display: flex; align-items: center;"><span style="font-size: 20px; margin-right: 8px;">⏱️</span>Stop Duration Analysis</h4>
                  <div style="margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong style="color: #dc3545;">Longest Stop:</strong> ${shift.longest_stop_duration || 0} min</p>
                    <p style="margin: 5px 0;"><strong style="color: #dc3545;">Average Stop:</strong> ${shift.average_stop_duration || 0} min</p>
                  </div>
                  <small style="color: #6c757d;">Duration analysis of production stops</small>
                </div>
              </div>
            </div>`;
      
      // Add enhanced traditional report data section
      html += `
            <div class="traditional-data">
              <h2 class="section-title" style="display: flex; align-items: center;"><span style="font-size: 32px; margin-right: 15px;">📈</span>Detailed Asset Performance</h2>`;
      
      // Add asset performance table with enhanced styling
      if (assets && assets.length > 0) {
        html += `
              <div style="overflow-x: auto;">
                <table class="asset-table">
                  <thead>
                    <tr>
                      <th>🏷️ Asset Name</th>
                      <th>📍 Location</th>
                      <th>🟢 Availability</th>
                      <th>⏱️ Runtime (min)</th>
                      <th>🔴 Downtime (min)</th>
                      <th>🛑 Total Stops</th>
                      <th>⚡ Short Stops</th>
                      <th>📊 Status</th>
                    </tr>
                  </thead>
                  <tbody>`;
        
        assets.forEach(asset => {
          const availability = asset.availability || 0;
          const availabilityClass = availability >= 90 ? 'availability-excellent' : 
                                   availability >= 75 ? 'availability-good' : 'availability-poor';
          const statusClass = availability >= 90 ? 'status-excellent' : 
                             availability >= 75 ? 'status-good' : 'status-poor';
          const statusText = availability >= 90 ? 'Excellent' : 
                            availability >= 75 ? 'Good' : 'Needs Attention';
          
          html += `
                    <tr>
                      <td><strong>${asset.asset_name || 'Unknown'}</strong><br><small>Pin: ${asset.pin_number || 'N/A'}</small></td>
                      <td>${asset.location || 'Unknown'}</td>
                      <td class="${availabilityClass}">${(availability || 0).toFixed(1)}%</td>
                      <td>${Math.round(asset.runtime || 0)}</td>
                      <td>${Math.round(asset.downtime || 0)}</td>
                      <td>${asset.stops || 0}</td>
                      <td>${asset.short_stops || 0}</td>
                      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    </tr>`;
        });
        
        html += `
                  </tbody>
                </table>
              </div>`;
      }
      
      html += `
              
              <!-- Enhanced Footer -->
              <div style="margin-top: 40px; text-align: center; padding: 25px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px; border: 1px solid #dee2e6;">
                <div style="font-size: 24px; margin-bottom: 10px;">🏭</div>
                <div style="font-size: 14px; color: #6c757d; font-weight: 600; margin-bottom: 5px;">
                  Manufacturing Dashboard System - Enhanced Report
                </div>
                <div style="font-size: 12px; color: #adb5bd;">
                  Generated on ${new Date().toLocaleString()} | Report ID: ${shift.id || 'N/A'}
                </div>
              </div>
            </div>
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
      
      // Generate the standard report with detailed error logging
      let reportResult;
      try {
        console.log('🔍 About to call generateShiftReport...');
        reportResult = await this.generateShiftReport(shiftId, options);
        console.log('✅ generateShiftReport completed successfully');
      } catch (reportError) {
        console.error('❌ Error in generateShiftReport:', reportError.message);
        console.error('Stack trace:', reportError.stack);
        throw reportError;
      }
      
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
        mtbf_minutes: parseFloat(((mtbfMinutes || 0)).toFixed(2)),
        mttr_minutes: parseFloat(((mttrMinutes || 0)).toFixed(2)),
        stop_frequency: parseFloat(((stopFrequency || 0)).toFixed(2)),
        micro_stops_count: microStops.length,
        micro_stops_time: microStopsTime,
        micro_stops_percentage: parseFloat(((microStopsPercentage || 0)).toFixed(2)),
        longest_stop_duration: longestStopDuration,
        average_stop_duration: parseFloat(((averageStopDuration || 0)).toFixed(2))
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