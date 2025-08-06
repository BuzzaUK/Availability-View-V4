const memoryDB = require('../utils/memoryDB');

// Helper function to calculate time difference in minutes
const getTimeDifferenceInMinutes = (startDate, endDate) => {
  return Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 60);
};

// Helper function to get date range filter
const getDateRangeFilter = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago
  const end = endDate ? new Date(endDate) : new Date(); // Default to now
  return { start, end };
};

// @desc    Get overall analytics
// @route   GET /api/analytics/overview
// @access  Private
exports.getOverviewAnalytics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);

    // Get all assets and events
    const assets = memoryDB.getAllAssets();
    const allEvents = memoryDB.getAllEvents();
    
    // Filter events by date range
    const events = allEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    // Calculate overall metrics
    let totalRuntime = 0;
    let totalDowntime = 0;
    let totalStops = 0;
    let activeAssets = 0;

    assets.forEach(asset => {
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
          total_assets: assets.length,
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

    const assets = asset_id ? 
      [memoryDB.findAssetById(asset_id)].filter(Boolean) : 
      memoryDB.getAllAssets();

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

    const assets = asset_id ? 
      [memoryDB.findAssetById(asset_id)].filter(Boolean) : 
      memoryDB.getAllAssets();

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

      const totalTime = totalRuntime + totalDowntime;
      const availability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;
      const mtbf = totalStops > 0 ? totalRuntime / totalStops : 0; // Mean Time Between Failures
      const mttr = totalStops > 0 ? totalDowntime / totalStops : 0; // Mean Time To Repair

      return {
        asset_id: asset._id,
        asset_name: asset.name,
        availability: parseFloat((availability / 100).toFixed(4)), // Convert to decimal for frontend
        performance: 0.85, // Mock performance rate as decimal
        quality: 0.95, // Mock quality rate as decimal
        oee: parseFloat(((availability / 100) * 0.85 * 0.95).toFixed(4)), // Calculate OEE as decimal
        runtime: parseFloat((totalRuntime * 1000).toFixed(2)), // Convert to milliseconds
        downtime: parseFloat((totalDowntime * 1000).toFixed(2)), // Convert to milliseconds
        total_stops: totalStops,
        total_cycles: totalCycles,
        mtbf: parseFloat(mtbf.toFixed(2)),
        mttr: parseFloat(mttr.toFixed(2)),
        efficiency: parseFloat((availability * 0.85).toFixed(2)) // Mock efficiency calculation
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

    let assets = memoryDB.getAllAssets();
    
    // Filter by specific asset if requested
    if (asset_id) {
      assets = assets.filter(asset => asset._id == asset_id);
    }

    const allEvents = memoryDB.getAllEvents();
    
    const assetAnalytics = assets.map(asset => {
      // Get events for this asset in the date range
      const assetEvents = allEvents.filter(event => {
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

      return {
        asset_id: asset._id,
        name: asset.name,
        pin_number: asset.pin_number,
        current_state: asset.current_state,
        availability: parseFloat(availability.toFixed(2)),
        runtime: parseFloat(runtime.toFixed(2)),
        downtime: parseFloat(downtime.toFixed(2)),
        stops: stops,
        events_count: assetEvents.length,
        last_state_change: asset.last_state_change
      };
    });

    res.status(200).json({
      success: true,
      count: assetAnalytics.length,
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

    let shifts = memoryDB.getAllShifts();
    
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
    res.status(500).json({
      success: false,
      message: 'Server Error',
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