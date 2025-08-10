const memoryDB = require('../utils/memoryDB');

// Helper function to calculate time difference in minutes
const getTimeDifferenceInMinutes = (startDate, endDate) => {
  return Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 60);
};

// Helper function to get date range with defaults
const getDateRangeFilter = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago
  const end = endDate ? new Date(endDate) : new Date(); // Default to now
  return { start, end };
};

// Helper function to get user-scoped assets and events
const getUserScopedData = (req) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Get user's assets and events
  const userAssets = memoryDB.getAssetsByUserId(userId);
  const userEvents = memoryDB.getEventsByUserId(userId);
  
  return { userAssets, userEvents, userId };
};

// @desc    Get overall analytics
// @route   GET /api/analytics/overview
// @access  Private
exports.getOverviewAnalytics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userAssets, userEvents } = getUserScopedData(req);

    // Filter events by date range
    const events = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    // Calculate overall metrics
    let totalRuntime = 0;
    let totalDowntime = 0;
    let totalStops = 0;
    let activeAssets = 0;

    userAssets.forEach(asset => {
      totalRuntime += asset.runtime || 0;
      totalDowntime += asset.downtime || 0;
      totalStops += asset.total_stops || 0;
      if (asset.current_state === 'RUNNING') {
        activeAssets++;
      }
    });

    const totalTime = totalRuntime + totalDowntime;
    const overallAvailability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;

    // Calculate event statistics
    const eventStats = {
      total: events.length,
      starts: events.filter(e => e.event_type === 'START').length,
      stops: events.filter(e => e.event_type === 'STOP').length,
      shifts: events.filter(e => e.event_type === 'SHIFT').length
    };

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total_assets: userAssets.length,
          active_assets: activeAssets,
          overall_availability: parseFloat(overallAvailability.toFixed(2)),
          total_runtime: parseFloat(totalRuntime.toFixed(2)),
          total_downtime: parseFloat(totalDowntime.toFixed(2)),
          total_stops: totalStops
        },
        events: eventStats,
        date_range: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get OEE Analytics
// @route   GET /api/analytics/oee
// @access  Private
exports.getOEEAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, asset_id } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userAssets, userEvents } = getUserScopedData(req);

    const assets = asset_id ? 
      userAssets.filter(asset => asset._id == asset_id) : 
      userAssets;

    const allEvents = memoryDB.getAllEvents();
    
    // Generate time-series data based on groupBy parameter
    const { groupBy = 'day' } = req.query;
    const oeeData = [];
    
    // Generate date range based on groupBy
    const generateDateRange = (start, end, groupBy) => {
      const dates = [];
      const current = new Date(start);
      
      while (current <= end) {
        dates.push(new Date(current));
        
        switch (groupBy) {
          case 'day':
            current.setDate(current.getDate() + 1);
            break;
          case 'week':
            current.setDate(current.getDate() + 7);
            break;
          case 'month':
            current.setMonth(current.getMonth() + 1);
            break;
          default:
            current.setDate(current.getDate() + 1);
        }
      }
      return dates;
    };
    
    const dateRange = generateDateRange(start, end, groupBy);
    
    dateRange.forEach(date => {
      const nextDate = new Date(date);
      switch (groupBy) {
        case 'day':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'week':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'month':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }
      
      // Filter events for this time period
      const periodEvents = allEvents.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= date && eventDate < nextDate;
      });
      
      let totalRuntime = 0;
      let totalDowntime = 0;
      let plannedProductionTime = 8 * 60 * 60; // 8 hours in seconds
      
      periodEvents.forEach(event => {
        if (event.event_type === 'START' || event.state === 'RUNNING') {
          totalRuntime += event.duration || 0;
        } else if (event.event_type === 'STOP' || event.state === 'STOPPED') {
          totalDowntime += event.duration || 0;
        }
      });
      
      const availability = plannedProductionTime > 0 ? (totalRuntime / plannedProductionTime) : 0;
      const performance = 0.85; // Mock performance rate as decimal
      const quality = 0.95; // Mock quality rate as decimal
      const oee = availability * performance * quality;
      
      oeeData.push({
        date: date.toISOString(),
        availability: parseFloat(availability.toFixed(4)),
        performance: parseFloat(performance.toFixed(4)),
        quality: parseFloat(quality.toFixed(4)),
        oee: parseFloat(oee.toFixed(4)),
        runtime: parseFloat(totalRuntime.toFixed(2)),
        downtime: parseFloat(totalDowntime.toFixed(2))
      });
    });

    res.status(200).json({
      success: true,
      data: oeeData,
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get Downtime Analytics
// @route   GET /api/analytics/downtime
// @access  Private
exports.getDowntimeAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, asset_id } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);

    const allEvents = memoryDB.getAllEvents();
    
    let downtimeEvents = allEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return (event.event_type === 'STOP' || event.state === 'STOPPED') && 
             eventDate >= start && eventDate <= end;
    });

    if (asset_id) {
      downtimeEvents = downtimeEvents.filter(event => event.asset == asset_id);
    }

    // Group by reason/note
    const downtimeByReason = downtimeEvents.reduce((acc, event) => {
      const reason = event.note || 'Unknown';
      if (!acc[reason]) {
        acc[reason] = {
          reason,
          count: 0,
          total_duration: 0,
          events: []
        };
      }
      acc[reason].count++;
      acc[reason].total_duration += event.duration || 0;
      acc[reason].events.push(event);
      return acc;
    }, {});

    const downtimeReasons = Object.values(downtimeByReason).map(item => ({
      reason: item.reason,
      count: item.count,
      duration: parseFloat((item.total_duration * 1000).toFixed(2)), // Convert to milliseconds for frontend
      total_duration: parseFloat(item.total_duration.toFixed(2)),
      average_duration: parseFloat((item.total_duration / item.count).toFixed(2)),
      percentage: parseFloat(((item.total_duration / downtimeEvents.reduce((sum, e) => sum + (e.duration || 0), 0)) * 100).toFixed(2))
    }));

    res.status(200).json({
      success: true,
      data: {
        total_downtime_events: downtimeEvents.length,
        total_downtime_duration: parseFloat(downtimeEvents.reduce((sum, e) => sum + (e.duration || 0), 0).toFixed(2)),
        downtime_by_reason: downtimeReasons,
        recent_events: downtimeEvents
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 10)
      },
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get State Distribution
// @route   GET /api/analytics/state-distribution
// @access  Private
exports.getStateDistribution = async (req, res) => {
  try {
    const { start_date, end_date, asset_id } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);

    const allEvents = memoryDB.getAllEvents();
    
    let events = allEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    if (asset_id) {
      events = events.filter(event => event.asset == asset_id);
    }

    // Group by state
    const stateDistribution = events.reduce((acc, event) => {
      const state = event.state || 'UNKNOWN';
      if (!acc[state]) {
        acc[state] = {
          state,
          count: 0,
          total_duration: 0
        };
      }
      acc[state].count++;
      acc[state].total_duration += event.duration || 0;
      return acc;
    }, {});

    const totalDuration = Object.values(stateDistribution).reduce((sum, item) => sum + item.total_duration, 0);

    const distributionData = Object.values(stateDistribution).map(item => ({
      state: item.state,
      count: item.count,
      duration: parseFloat((item.total_duration * 1000).toFixed(2)), // Convert to milliseconds for frontend
      percentage: parseFloat(((item.total_duration / totalDuration) * 100).toFixed(2))
    }));

    res.status(200).json({
      success: true,
      data: {
        distribution: distributionData,
        total_events: events.length,
        total_duration: parseFloat(totalDuration.toFixed(2))
      },
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get Performance Metrics
// @route   GET /api/analytics/performance-metrics
// @access  Private
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const { start_date, end_date, asset_id } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userAssets, userEvents } = getUserScopedData(req);

    const assets = asset_id ? 
      userAssets.filter(asset => asset._id == asset_id) : 
      userAssets;

    const allEvents = memoryDB.getAllEvents();
    
    const performanceData = assets.map(asset => {
      const assetEvents = allEvents.filter(event => {
        const eventDate = new Date(event.timestamp);
        return event.asset == asset._id && eventDate >= start && eventDate <= end;
      });

      let totalRuntime = 0;
      let totalDowntime = 0;
      let totalStops = 0;
      let totalCycles = assetEvents.length;

      assetEvents.forEach(event => {
        if (event.event_type === 'START' || event.state === 'RUNNING') {
          totalRuntime += event.duration || 0;
        } else if (event.event_type === 'STOP' || event.state === 'STOPPED') {
          totalDowntime += event.duration || 0;
          totalStops++;
        }
      });

      // Calculate MTBF (Mean Time Between Failures) in hours
      const mtbf = totalStops > 0 ? (totalRuntime / 60) / totalStops : 0;
      
      // Calculate MTTR (Mean Time To Repair) in hours  
      const mttr = totalStops > 0 ? (totalDowntime / 60) / totalStops : 0;

      // Calculate availability percentage
      const totalTime = totalRuntime + totalDowntime;
      const availability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;

      // Calculate OEE (simplified version)
      const oee = availability; // In real implementation, multiply by Performance and Quality rates

      return {
        asset_id: asset._id,
        asset_name: asset.name,
        runtime_hours: parseFloat((totalRuntime / 60).toFixed(2)),
        downtime_hours: parseFloat((totalDowntime / 60).toFixed(2)),
        total_stops: totalStops,
        mtbf_hours: parseFloat(mtbf.toFixed(2)),
        mttr_hours: parseFloat(mttr.toFixed(2)),
        availability_percent: parseFloat(availability.toFixed(2)),
        oee_percent: parseFloat(oee.toFixed(2)),
        total_cycles: totalCycles
      };
    });

    res.status(200).json({
      success: true,
      data: performanceData,
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get asset analytics
// @route   GET /api/analytics/assets
// @access  Private
exports.getAssetAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, asset_id } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userAssets, userEvents } = getUserScopedData(req);

    let assets = userAssets;
    
    // Filter by specific asset if requested
    if (asset_id) {
      assets = assets.filter(asset => asset._id == asset_id);
    }
    
    const assetAnalytics = assets.map(asset => {
      // Get events for this asset in the date range
      const assetEvents = userEvents.filter(event => {
        const eventDate = new Date(event.timestamp);
        return event.asset == asset._id && eventDate >= start && eventDate <= end;
      });

      // Calculate metrics from events
      let runtime = 0;
      let downtime = 0;
      let stops = 0;

      assetEvents.forEach(event => {
        runtime += event.runtime || 0;
        downtime += event.downtime || 0;
        if (event.event_type === 'STOP') {
          stops++;
        }
      });

      // Use asset's current metrics if no events in range
      if (assetEvents.length === 0) {
        runtime = asset.runtime || 0;
        downtime = asset.downtime || 0;
        stops = asset.total_stops || 0;
      }

      const totalTime = runtime + downtime;
      const availability = totalTime > 0 ? (runtime / totalTime) * 100 : 0;

      // Calculate MTBF and MTTR
      const mtbf = stops > 0 ? (runtime / 60) / stops : 0;
      const mttr = stops > 0 ? (downtime / 60) / stops : 0;

      return {
        asset_id: asset._id,
        asset_name: asset.name,
        pin_number: asset.pin_number,
        current_state: asset.current_state,
        availability: parseFloat(availability.toFixed(2)),
        runtime_hours: parseFloat((runtime / 60).toFixed(2)),
        downtime_hours: parseFloat((downtime / 60).toFixed(2)),
        total_stops: stops,
        mtbf_hours: parseFloat(mtbf.toFixed(2)),
        mttr_hours: parseFloat(mttr.toFixed(2)),
        events_count: assetEvents.length,
        logger_id: asset.logger_id
      };
    });

    res.status(200).json({
      success: true,
      data: assetAnalytics,
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get shift analytics
// @route   GET /api/analytics/shifts
// @access  Private
exports.getShiftAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, shift_id } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);

    // Fix line 490
    let shifts = memoryDB.getShifts();
    
    // Filter by specific shift if requested
    if (shift_id) {
      shifts = shifts.filter(shift => shift._id == shift_id);
    }

    // Filter shifts by date range
    shifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      return shiftDate >= start && shiftDate <= end;
    });

    const shiftAnalytics = shifts.map(shift => {
      const duration = shift.end_time ? 
        getTimeDifferenceInMinutes(shift.start_time, shift.end_time) : 
        getTimeDifferenceInMinutes(shift.start_time, new Date());

      return {
        shift_id: shift._id,
        shift_number: shift.shift_number,
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        duration: parseFloat(duration.toFixed(2)),
        active: shift.active,
        availability: parseFloat((shift.availability || 0).toFixed(2)),
        runtime: parseFloat((shift.runtime || 0).toFixed(2)),
        downtime: parseFloat((shift.downtime || 0).toFixed(2)),
        stops: shift.stops || 0,
        asset_count: shift.asset_states ? shift.asset_states.length : 0,
        notes: shift.notes
      };
    });

    res.status(200).json({
      success: true,
      count: shiftAnalytics.length,
      data: shiftAnalytics,
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting shift analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get shift analytics',
      error: error.message 
    });
  }
};

// @desc    Get event analytics
// @route   GET /api/analytics/events
// @access  Private
exports.getEventAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, asset_id, event_type } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);

    let events = memoryDB.getAllEvents();
    
    // Filter events by date range
    events = events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    // Filter by asset if specified
    if (asset_id) {
      events = events.filter(event => event.asset == asset_id);
    }

    // Filter by event type if specified
    if (event_type) {
      events = events.filter(event => event.event_type === event_type);
    }

    // Group events by type
    const eventsByType = events.reduce((acc, event) => {
      const type = event.event_type || 'UNKNOWN';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(event);
      return acc;
    }, {});

    // Calculate statistics for each event type
    const eventTypeStats = Object.keys(eventsByType).map(type => {
      const typeEvents = eventsByType[type];
      const totalDuration = typeEvents.reduce((sum, event) => sum + (event.duration || 0), 0);
      const avgDuration = typeEvents.length > 0 ? totalDuration / typeEvents.length : 0;

      return {
        event_type: type,
        count: typeEvents.length,
        total_duration: parseFloat(totalDuration.toFixed(2)),
        average_duration: parseFloat(avgDuration.toFixed(2))
      };
    });

    // Group events by asset
    const eventsByAsset = events.reduce((acc, event) => {
      const assetId = event.asset || 'unknown';
      if (!acc[assetId]) {
        acc[assetId] = [];
      }
      acc[assetId].push(event);
      return acc;
    }, {});

    const assetEventStats = Object.keys(eventsByAsset).map(assetId => {
      const assetEvents = eventsByAsset[assetId];
      const asset = memoryDB.findAssetById(assetId);
      
      return {
        asset_id: assetId,
        asset_name: asset ? asset.name : 'Unknown',
        event_count: assetEvents.length,
        latest_event: assetEvents.length > 0 ? 
          assetEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] : null
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total_events: events.length,
          unique_assets: Object.keys(eventsByAsset).length,
          event_types: Object.keys(eventsByType).length
        },
        by_type: eventTypeStats,
        by_asset: assetEventStats,
        recent_events: events
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 10) // Last 10 events
      },
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get availability trends
// @route   GET /api/analytics/trends
// @access  Private
exports.getAvailabilityTrends = async (req, res) => {
  try {
    const { start_date, end_date, asset_id, interval = 'daily' } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);

    const assets = asset_id ? 
      [memoryDB.findAssetById(asset_id)].filter(Boolean) : 
      memoryDB.getAllAssets();

    const allEvents = memoryDB.getAllEvents();
    
    // Filter events by date range
    const events = allEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    // Generate time intervals based on the requested interval
    const intervals = [];
    const intervalMs = interval === 'hourly' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    for (let time = start.getTime(); time < end.getTime(); time += intervalMs) {
      intervals.push(new Date(time));
    }

    const trends = intervals.map(intervalStart => {
      const intervalEnd = new Date(intervalStart.getTime() + intervalMs);
      
      const intervalEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= intervalStart && eventDate < intervalEnd;
      });

      // Calculate metrics for this interval
      let totalRuntime = 0;
      let totalDowntime = 0;
      let totalStops = 0;

      assets.forEach(asset => {
        const assetEvents = intervalEvents.filter(event => event.asset == asset._id);
        
        assetEvents.forEach(event => {
          totalRuntime += event.runtime || 0;
          totalDowntime += event.downtime || 0;
          if (event.event_type === 'STOP') {
            totalStops++;
          }
        });
      });

      const totalTime = totalRuntime + totalDowntime;
      const availability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;

      return {
        timestamp: intervalStart.toISOString(),
        availability: parseFloat(availability.toFixed(2)),
        runtime: parseFloat(totalRuntime.toFixed(2)),
        downtime: parseFloat(totalDowntime.toFixed(2)),
        stops: totalStops,
        events_count: intervalEvents.length
      };
    });

    res.status(200).json({
      success: true,
      data: {
        trends,
        interval,
        asset_count: assets.length
      },
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get comprehensive availability analytics
// @route   GET /api/analytics/availability
// @access  Private
exports.getAvailabilityAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, asset_id } = req.query;
    const { userAssets } = getUserScopedData(req);

    // Filter assets if specific asset requested
    const assets = asset_id ? 
      userAssets.filter(asset => asset._id == asset_id) : 
      userAssets;

    // Calculate overall KPIs using asset data (same as dashboard)
    let totalRuntime = 0; // in milliseconds
    let totalDowntime = 0; // in milliseconds
    let totalStops = 0;
    let activeAssets = 0;

    // Analyze each asset using stored asset data
    const assetAnalytics = assets.map(asset => {
      const assetRuntime = asset.runtime || 0; // milliseconds
      const assetDowntime = asset.downtime || 0; // milliseconds
      const assetStops = asset.total_stops || 0;

      // Add to totals
      totalRuntime += assetRuntime;
      totalDowntime += assetDowntime;
      totalStops += assetStops;

      if (asset.current_state === 'RUNNING') {
        activeAssets++;
      }

      // Calculate asset-specific metrics
      const assetTotalTime = assetRuntime + assetDowntime;
      const assetAvailability = assetTotalTime > 0 ? (assetRuntime / assetTotalTime) * 100 : 0;
      
      // Calculate MTBF and MTTR (simplified calculation based on total time and stops)
      const assetMTBF = assetStops > 0 ? (assetRuntime / 3600000) / assetStops : 0; // Hours
      const assetMTTR = assetStops > 0 ? (assetDowntime / 3600000) / assetStops : 0; // Hours

      return {
        asset_id: asset._id,
        asset_name: asset.name,
        availability: parseFloat(assetAvailability.toFixed(2)),
        runtime_hours: parseFloat((assetRuntime / 3600000).toFixed(2)), // Convert ms to hours
        downtime_hours: parseFloat((assetDowntime / 3600000).toFixed(2)), // Convert ms to hours
        total_stops: assetStops,
        mtbf_hours: parseFloat(assetMTBF.toFixed(2)),
        mttr_hours: parseFloat(assetMTTR.toFixed(2)),
        current_state: asset.current_state || 'UNKNOWN'
      };
    });

    // Calculate overall metrics using asset data (same as dashboard)
    const totalTime = totalRuntime + totalDowntime;
    const overallAvailability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;
    const avgMTBF = assets.length > 0 && totalStops > 0 ? (totalRuntime / 3600000) / totalStops : 0;
    const avgMTTR = assets.length > 0 && totalStops > 0 ? (totalDowntime / 3600000) / totalStops : 0;

    // For micro stops analysis, we need to look at events for detailed breakdown
    const { userEvents } = getUserScopedData(req);
    const { start, end } = getDateRangeFilter(start_date, end_date);
    
    // Filter events by date range for micro stops analysis
    const events = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    // Calculate micro stops from events (stops under 3 minutes)
    let microStops = 0;
    let microStopTime = 0; // in seconds

    const stopEvents = events.filter(event => 
      (event.event_type === 'STOP' || event.state === 'STOPPED') &&
      (!asset_id || event.asset == asset_id)
    );

    stopEvents.forEach(event => {
      const duration = event.duration || 0; // seconds
      if (duration < 180) { // Under 3 minutes
        microStops++;
        microStopTime += duration;
      }
    });

    // Calculate additional KPIs
    const utilizationRate = totalTime > 0 ? (totalRuntime / totalTime) * 100 : overallAvailability;
    const stopFrequency = totalRuntime > 0 ? (totalStops / (totalRuntime / 3600000)) : 0; // Stops per hour
    const microStopPercentage = totalStops > 0 ? (microStops / totalStops) * 100 : 0;

    // Generate micro stops trend data for chart
    const microStopTrend = [];
    const dayMs = 24 * 60 * 60 * 1000;
    for (let time = start.getTime(); time < end.getTime(); time += dayMs) {
      const dayStart = new Date(time);
      const dayEnd = new Date(time + dayMs);
      
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= dayStart && eventDate < dayEnd && 
               (event.event_type === 'STOP' || event.state === 'STOPPED') &&
               (event.duration || 0) < 180; // Under 3 minutes
      });

      const dayMicroStops = dayEvents.length;
      const dayMicroStopTime = dayEvents.reduce((sum, event) => sum + (event.duration || 0), 0);

      microStopTrend.push({
        date: dayStart.toISOString().split('T')[0],
        micro_stops: dayMicroStops,
        micro_stop_time_minutes: parseFloat((dayMicroStopTime / 60).toFixed(2))
      });
    }

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total_assets: assets.length,
          active_assets: activeAssets,
          overall_availability: parseFloat(overallAvailability.toFixed(2)),
          total_runtime_hours: parseFloat((totalRuntime / 3600000).toFixed(2)), // Convert ms to hours
          total_downtime_hours: parseFloat((totalDowntime / 3600000).toFixed(2)), // Convert ms to hours
          total_stops: totalStops,
          micro_stops: microStops,
          micro_stop_time_hours: parseFloat((microStopTime / 3600).toFixed(2)), // Convert seconds to hours
          avg_mtbf_hours: parseFloat(avgMTBF.toFixed(2)),
          avg_mttr_hours: parseFloat(avgMTTR.toFixed(2)),
          utilization_rate: parseFloat(utilizationRate.toFixed(2)),
          stop_frequency_per_hour: parseFloat(stopFrequency.toFixed(2)),
          micro_stop_percentage: parseFloat(microStopPercentage.toFixed(2))
        },
        assets: assetAnalytics,
        micro_stop_trend: microStopTrend,
        date_range: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error getting availability analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get availability analytics',
      error: error.message
    });
  }
};