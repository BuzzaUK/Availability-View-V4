const databaseService = require('../services/databaseService');

// Helper function to calculate time difference in minutes
const getTimeDifferenceInMinutes = (startDate, endDate) => {
  return Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 60);
};

// Helper function to get date range with defaults
const getDateRangeFilter = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();
  return { start, end };
};

// Helper function to get user-scoped assets and events from SQL database
const getUserScopedData = async (req) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const userAssets = await databaseService.getAllAssets();
  const eventsResult = await databaseService.getAllEvents();
  
  // Extract rows from findAndCountAll result
  const userEvents = eventsResult.rows || eventsResult;
  
  return { userAssets, userEvents, userId };
};

// @desc    Get overall analytics
// @route   GET /api/analytics/overview
// @access  Private
exports.getOverviewAnalytics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userAssets, userEvents } = await getUserScopedData(req);

    const events = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

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

    const eventStats = {
      total: events.length,
      starts: events.filter(e => e.event_type === 'START').length,
      stops: events.filter(e => e.event_type === 'STOP').length,
      shifts: events.filter(e => e.event_type === 'SHIFT').length,
      state_changes: events.filter(e => e.event_type === 'STATE_CHANGE').length
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
    const { start_date, end_date, asset_id, groupBy = 'day' } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userAssets, userEvents } = await getUserScopedData(req);

    const assets = asset_id ? 
      userAssets.filter(asset => asset.id == asset_id || asset._id == asset_id) : 
      userAssets;

    const oeeData = [];
    
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
      
      const periodEvents = userEvents.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= date && eventDate < nextDate;
      });
      
      let totalRuntime = 0;
      let totalDowntime = 0;
      let plannedProductionTime = 8 * 60 * 60;
      
      periodEvents.forEach(event => {
        if (event.event_type === 'STATE_CHANGE') {
          if (event.new_state === 'RUNNING') {
            totalRuntime += event.duration || 0;
          } else if (event.new_state === 'STOPPED') {
            totalDowntime += event.duration || 0;
          }
        }
      });
      
      const availability = plannedProductionTime > 0 ? (totalRuntime / plannedProductionTime) : 0;
      const performance = 0.85;
      const quality = 0.95;
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

// @desc    Get downtime analytics
// @route   GET /api/analytics/downtime
// @access  Private
exports.getDowntimeAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, asset_id } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userEvents } = await getUserScopedData(req);
    
    let downtimeEvents = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end &&
             (event.event_type === 'STOP' || 
              (event.event_type === 'STATE_CHANGE' && event.new_state === 'STOPPED'));
    });

    if (asset_id) {
      downtimeEvents = downtimeEvents.filter(event => event.asset_id == asset_id);
    }

    const downtimeByReason = {};
    let totalDowntime = 0;

    downtimeEvents.forEach(event => {
      const duration = event.duration || 0;
      const reason = event.stop_reason || 'Unknown';
      
      if (!downtimeByReason[reason]) {
        downtimeByReason[reason] = {
          reason,
          total_duration: 0,
          count: 0,
          percentage: 0
        };
      }
      
      downtimeByReason[reason].total_duration += duration;
      downtimeByReason[reason].count++;
      totalDowntime += duration;
    });

    Object.values(downtimeByReason).forEach(item => {
      item.percentage = totalDowntime > 0 ? (item.total_duration / totalDowntime) * 100 : 0;
      item.avg_duration = item.count > 0 ? item.total_duration / item.count : 0;
    });

    const downtimeData = Object.values(downtimeByReason)
      .sort((a, b) => b.total_duration - a.total_duration);

    res.status(200).json({
      success: true,
      data: {
        total_downtime: totalDowntime,
        total_events: downtimeEvents.length,
        downtime_by_reason: downtimeData,
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

// @desc    Get state distribution analytics
// @route   GET /api/analytics/state-distribution
// @access  Private
exports.getStateDistribution = async (req, res) => {
  try {
    const { start_date, end_date, asset_id } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userEvents } = await getUserScopedData(req);

    let events = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    if (asset_id) {
      events = events.filter(event => event.asset_id == asset_id);
    }

    const stateDistribution = {};
    let totalDuration = 0;

    events.forEach(event => {
      const state = event.new_state || event.event_type;
      const duration = event.duration || 0;
      
      if (!stateDistribution[state]) {
        stateDistribution[state] = {
          state,
          total_duration: 0,
          count: 0,
          percentage: 0
        };
      }
      
      stateDistribution[state].total_duration += duration;
      stateDistribution[state].count++;
      totalDuration += duration;
    });

    Object.values(stateDistribution).forEach(item => {
      item.percentage = totalDuration > 0 ? (item.total_duration / totalDuration) * 100 : 0;
      item.avg_duration = item.count > 0 ? item.total_duration / item.count : 0;
    });

    const distributionData = Object.values(stateDistribution)
      .sort((a, b) => b.total_duration - a.total_duration);

    res.status(200).json({
      success: true,
      data: {
        total_duration: totalDuration,
        total_events: events.length,
        state_distribution: distributionData,
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

// @desc    Get performance metrics
// @route   GET /api/analytics/performance
// @access  Private
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const { start_date, end_date, asset_id } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userAssets, userEvents } = await getUserScopedData(req);

    const assets = asset_id ? 
      userAssets.filter(asset => asset.id == asset_id || asset._id == asset_id) : 
      userAssets;

    const events = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    let totalRuntime = 0;
    let totalDowntime = 0;
    let totalStops = 0;

    const assetMetrics = assets.map(asset => {
      const assetEvents = events.filter(event => event.asset_id == asset.id);
      
      let assetRuntime = 0;
      let assetDowntime = 0;
      let assetStops = 0;

      assetEvents.forEach(event => {
        if (event.event_type === 'STATE_CHANGE') {
          if (event.new_state === 'RUNNING') {
            assetRuntime += event.duration || 0;
          } else if (event.new_state === 'STOPPED') {
            assetDowntime += event.duration || 0;
            assetStops++;
          }
        }
      });

      totalRuntime += assetRuntime;
      totalDowntime += assetDowntime;
      totalStops += assetStops;

      const assetTotalTime = assetRuntime + assetDowntime;
      const availability = assetTotalTime > 0 ? (assetRuntime / assetTotalTime) * 100 : 0;
      const mtbf = assetStops > 0 ? (assetRuntime / 3600) / assetStops : 0;
      const mttr = assetStops > 0 ? (assetDowntime / 3600) / assetStops : 0;

      return {
        asset_id: asset.id,
        asset_name: asset.name,
        availability: parseFloat(availability.toFixed(2)),
        runtime_hours: parseFloat((assetRuntime / 3600).toFixed(2)),
        downtime_hours: parseFloat((assetDowntime / 3600).toFixed(2)),
        total_stops: assetStops,
        mtbf_hours: parseFloat(mtbf.toFixed(2)),
        mttr_hours: parseFloat(mttr.toFixed(2))
      };
    });

    const totalTime = totalRuntime + totalDowntime;
    const overallAvailability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;
    const overallMTBF = totalStops > 0 ? (totalRuntime / 3600) / totalStops : 0;
    const overallMTTR = totalStops > 0 ? (totalDowntime / 3600) / totalStops : 0;

    res.status(200).json({
      success: true,
      data: {
        overall_metrics: {
          availability: parseFloat(overallAvailability.toFixed(2)),
          total_runtime_hours: parseFloat((totalRuntime / 3600).toFixed(2)),
          total_downtime_hours: parseFloat((totalDowntime / 3600).toFixed(2)),
          total_stops: totalStops,
          mtbf_hours: parseFloat(overallMTBF.toFixed(2)),
          mttr_hours: parseFloat(overallMTTR.toFixed(2))
        },
        asset_metrics: assetMetrics,
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

// @desc    Get asset-specific analytics
// @route   GET /api/analytics/assets
// @access  Private
exports.getAssetAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, asset_id } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userAssets, userEvents } = await getUserScopedData(req);

    const assets = asset_id ? 
      userAssets.filter(asset => asset.id == asset_id || asset._id == asset_id) : 
      userAssets;

    const events = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    const assetAnalytics = assets.map(asset => {
      const assetEvents = events.filter(event => event.asset_id == asset.id);
      
      let runtime = 0;
      let downtime = 0;
      let stops = 0;

      assetEvents.forEach(event => {
        if (event.event_type === 'STATE_CHANGE') {
          if (event.new_state === 'RUNNING') {
            runtime += event.duration || 0;
          } else if (event.new_state === 'STOPPED') {
            downtime += event.duration || 0;
            stops++;
          }
        }
      });

      const totalTime = runtime + downtime;
      const availability = totalTime > 0 ? (runtime / totalTime) * 100 : 0;
      const mtbf = stops > 0 ? (runtime / 3600) / stops : 0;
      const mttr = stops > 0 ? (downtime / 3600) / stops : 0;

      return {
        asset_id: asset.id,
        asset_name: asset.name,
        current_state: asset.current_state || 'UNKNOWN',
        availability: parseFloat(availability.toFixed(2)),
        runtime_hours: parseFloat((runtime / 3600).toFixed(2)),
        downtime_hours: parseFloat((downtime / 3600).toFixed(2)),
        total_stops: stops,
        mtbf_hours: parseFloat(mtbf.toFixed(2)),
        mttr_hours: parseFloat(mttr.toFixed(2)),
        events_count: assetEvents.length
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
    const { userEvents } = await getUserScopedData(req);

    let shiftEvents = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    if (shift_id) {
      shiftEvents = shiftEvents.filter(event => event.shift_id == shift_id);
    }

    const shiftData = {};

    shiftEvents.forEach(event => {
      const shiftId = event.shift_id || 'no_shift';
      
      if (!shiftData[shiftId]) {
        shiftData[shiftId] = {
          shift_id: shiftId,
          total_events: 0,
          runtime: 0,
          downtime: 0,
          stops: 0,
          start_time: null,
          end_time: null
        };
      }

      shiftData[shiftId].total_events++;

      if (event.event_type === 'STATE_CHANGE') {
        if (event.new_state === 'RUNNING') {
          shiftData[shiftId].runtime += event.duration || 0;
        } else if (event.new_state === 'STOPPED') {
          shiftData[shiftId].downtime += event.duration || 0;
          shiftData[shiftId].stops++;
        }
      }

      const eventTime = new Date(event.timestamp);
      if (!shiftData[shiftId].start_time || eventTime < shiftData[shiftId].start_time) {
        shiftData[shiftId].start_time = eventTime;
      }
      if (!shiftData[shiftId].end_time || eventTime > shiftData[shiftId].end_time) {
        shiftData[shiftId].end_time = eventTime;
      }
    });

    const shiftAnalytics = Object.values(shiftData).map(shift => {
      const totalTime = shift.runtime + shift.downtime;
      const availability = totalTime > 0 ? (shift.runtime / totalTime) * 100 : 0;
      const duration = shift.start_time && shift.end_time ? 
        getTimeDifferenceInMinutes(shift.start_time, shift.end_time) : 0;

      return {
        ...shift,
        availability: parseFloat(availability.toFixed(2)),
        runtime_hours: parseFloat((shift.runtime / 3600).toFixed(2)),
        downtime_hours: parseFloat((shift.downtime / 3600).toFixed(2)),
        duration_minutes: parseFloat(duration.toFixed(2)),
        start_time: shift.start_time ? shift.start_time.toISOString() : null,
        end_time: shift.end_time ? shift.end_time.toISOString() : null
      };
    });

    res.status(200).json({
      success: true,
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
    const { userEvents } = await getUserScopedData(req);

    let events = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    if (asset_id) {
      events = events.filter(event => event.asset_id == asset_id);
    }

    if (event_type) {
      events = events.filter(event => event.event_type === event_type);
    }

    const eventsByType = {};
    events.forEach(event => {
      const type = event.event_type;
      if (!eventsByType[type]) {
        eventsByType[type] = {
          type,
          count: 0,
          total_duration: 0,
          avg_duration: 0
        };
      }
      eventsByType[type].count++;
      eventsByType[type].total_duration += event.duration || 0;
    });

    Object.values(eventsByType).forEach(item => {
      item.avg_duration = item.count > 0 ? item.total_duration / item.count : 0;
    });

    const recentEvents = events
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
      .map(event => ({
        id: event.id,
        timestamp: event.timestamp,
        event_type: event.event_type,
        asset_id: event.asset_id,
        duration: event.duration,
        stop_reason: event.stop_reason
      }));

    res.status(200).json({
      success: true,
      data: {
        total_events: events.length,
        events_by_type: Object.values(eventsByType),
        recent_events: recentEvents,
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

// @desc    Get availability trends
// @route   GET /api/analytics/availability-trends
// @access  Private
exports.getAvailabilityTrends = async (req, res) => {
  try {
    const { start_date, end_date, asset_id, groupBy = 'day' } = req.query;
    const { start, end } = getDateRangeFilter(start_date, end_date);
    const { userEvents } = await getUserScopedData(req);

    let events = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    if (asset_id) {
      events = events.filter(event => event.asset_id == asset_id);
    }

    const generatePeriods = (start, end, groupBy) => {
      const periods = [];
      const current = new Date(start);
      
      while (current < end) {
        const periodStart = new Date(current);
        let periodEnd = new Date(current);
        
        switch (groupBy) {
          case 'hour':
            periodEnd.setHours(periodEnd.getHours() + 1);
            break;
          case 'day':
            periodEnd.setDate(periodEnd.getDate() + 1);
            break;
          case 'week':
            periodEnd.setDate(periodEnd.getDate() + 7);
            break;
          case 'month':
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            break;
          default:
            periodEnd.setDate(periodEnd.getDate() + 1);
        }
        
        if (periodEnd > end) {
          periodEnd = new Date(end);
        }
        
        periods.push({ start: periodStart, end: periodEnd });
        
        switch (groupBy) {
          case 'hour':
            current.setHours(current.getHours() + 1);
            break;
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
      
      return periods;
    };

    const periods = generatePeriods(start, end, groupBy);

    const trendData = periods.map(period => {
      const periodEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= period.start && eventDate < period.end;
      });

      let totalRuntime = 0;
      let totalDowntime = 0;
      let totalStops = 0;

      periodEvents.forEach(event => {
        if (event.event_type === 'START' || event.state === 'RUNNING') {
          totalRuntime += event.duration || 0;
        } else if (event.event_type === 'STOP' || event.state === 'STOPPED') {
          totalDowntime += event.duration || 0;
          totalStops++;
        }
      });

      const totalTime = totalRuntime + totalDowntime;
      const availability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;

      return {
        period: period.start.toISOString(),
        availability: parseFloat(availability.toFixed(2)),
        runtime_hours: parseFloat((totalRuntime / 3600).toFixed(2)),
        downtime_hours: parseFloat((totalDowntime / 3600).toFixed(2)),
        total_stops: totalStops,
        events_count: periodEvents.length
      };
    });

    res.status(200).json({
      success: true,
      data: trendData,
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      groupBy
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
    const { userAssets, userEvents } = await getUserScopedData(req);

    const assets = asset_id ? 
      userAssets.filter(asset => asset.id == asset_id || asset._id == asset_id) : 
      userAssets;

    let totalRuntime = 0;
    let totalDowntime = 0;
    let totalStops = 0;
    let activeAssets = 0;

    const assetAnalytics = assets.map(asset => {
      const assetRuntime = asset.runtime || 0;
      const assetDowntime = asset.downtime || 0;
      const assetStops = asset.total_stops || 0;

      totalRuntime += assetRuntime;
      totalDowntime += assetDowntime;
      totalStops += assetStops;

      if (asset.current_state === 'RUNNING') {
        activeAssets++;
      }

      const assetTotalTime = assetRuntime + assetDowntime;
      const assetAvailability = assetTotalTime > 0 ? (assetRuntime / assetTotalTime) * 100 : 0;
      
      const assetMTBF = assetStops > 0 ? (assetRuntime / 3600) / assetStops : 0;
      const assetMTTR = assetStops > 0 ? (assetDowntime / 3600) / assetStops : 0;

      return {
        asset_id: asset.id || asset._id,
        asset_name: asset.name,
        availability: parseFloat(assetAvailability.toFixed(2)),
        runtime_hours: parseFloat((assetRuntime / 3600).toFixed(2)),
        downtime_hours: parseFloat((assetDowntime / 3600).toFixed(2)),
        total_stops: assetStops,
        mtbf_hours: parseFloat(assetMTBF.toFixed(2)),
        mttr_hours: parseFloat(assetMTTR.toFixed(2)),
        current_state: asset.current_state || 'UNKNOWN'
      };
    });

    const totalTime = totalRuntime + totalDowntime;
    const overallAvailability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;
    const avgMTBF = assets.length > 0 && totalStops > 0 ? (totalRuntime / 3600) / totalStops : 0;
    const avgMTTR = assets.length > 0 && totalStops > 0 ? (totalDowntime / 3600) / totalStops : 0;

    const { start, end } = getDateRangeFilter(start_date, end_date);
    
    const events = userEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    let microStops = 0;
    let microStopTime = 0;

    const stopEvents = events.filter(event => 
      (event.event_type === 'STATE_CHANGE' && event.new_state === 'STOPPED') &&
      (!asset_id || event.asset_id == asset_id)
    );

    stopEvents.forEach(event => {
      const duration = event.duration || 0;
      if (duration < 180) {
        microStops++;
        microStopTime += duration;
      }
    });

    const utilizationRate = totalTime > 0 ? (totalRuntime / totalTime) * 100 : overallAvailability;
    const stopFrequency = totalRuntime > 0 ? (totalStops / (totalRuntime / 3600)) : 0;
    const microStopPercentage = totalStops > 0 ? (microStops / totalStops) * 100 : 0;

    const microStopTrend = [];
    const dayMs = 24 * 60 * 60 * 1000;
    for (let time = start.getTime(); time < end.getTime(); time += dayMs) {
      const dayStart = new Date(time);
      const dayEnd = new Date(time + dayMs);
      
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= dayStart && eventDate < dayEnd && 
               (event.event_type === 'STATE_CHANGE' && event.new_state === 'STOPPED') &&
               (event.duration || 0) < 180;
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
          total_runtime_hours: parseFloat((totalRuntime / 3600).toFixed(2)),
          total_downtime_hours: parseFloat((totalDowntime / 3600).toFixed(2)),
          total_stops: totalStops,
          micro_stops: microStops,
          micro_stop_time_hours: parseFloat((microStopTime / 3600).toFixed(2)),
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