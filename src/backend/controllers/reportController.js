const databaseService = require('../services/databaseService');
const fs = require('fs');
const path = require('path');

// Helper function to calculate time difference in minutes
const getTimeDifferenceInMinutes = (startDate, endDate) => {
  return Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 60);
};

// Helper function to format date for CSV
const formatDateForCSV = (date) => {
  return new Date(date).toLocaleString();
};

// Generate enhanced filename with Date, Time, and Shift Name
const generateEnhancedFilename = (shiftName, shiftDate, extension) => {
  const date = new Date(shiftDate);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  const sanitizedShiftName = shiftName.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
  
  return `${dateStr}_${timeStr}_${sanitizedShiftName}_Shift_Report.${extension}`;
};

// @desc    Generate and download asset report
// @route   GET /api/reports/asset/:id
// @access  Private
exports.generateAssetReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, format = 'json' } = req.query;

    // Get asset
    const asset = await databaseService.findAssetById(id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Set date range (default to last 30 days)
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date ? new Date(start_date) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get events for this asset in the date range
    const allEvents = await databaseService.getAllEvents();
    const events = allEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return (event.asset_id || event.asset) == id && eventDate >= startDate && eventDate <= endDate;
    });

    // Calculate metrics
    let totalRuntime = 0;
    let totalDowntime = 0;
    let totalStops = 0;

    events.forEach(event => {
      totalRuntime += event.runtime || 0;
      totalDowntime += event.downtime || 0;
      if (event.event_type === 'STOP') {
        totalStops++;
      }
    });

    // Use asset's current metrics if no events in range
    if (events.length === 0) {
      totalRuntime = asset.runtime || 0;
      totalDowntime = asset.downtime || 0;
      totalStops = asset.total_stops || 0;
    }

    const totalTime = totalRuntime + totalDowntime;
    const availability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;

    // Group events by day
    const dailyData = {};
    events.forEach(event => {
      const day = new Date(event.timestamp).toISOString().split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = {
          date: day,
          runtime: 0,
          downtime: 0,
          stops: 0,
          events: []
        };
      }
      dailyData[day].runtime += event.runtime || 0;
      dailyData[day].downtime += event.downtime || 0;
      if (event.event_type === 'STOP') {
        dailyData[day].stops++;
      }
      dailyData[day].events.push(event);
    });

    // Convert to array and calculate daily availability
    const dailyBreakdown = Object.values(dailyData).map(day => {
      const dayTotal = day.runtime + day.downtime;
      const dayAvailability = dayTotal > 0 ? (day.runtime / dayTotal) * 100 : 0;
      return {
        ...day,
        availability: parseFloat(dayAvailability.toFixed(2))
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    const reportData = {
      asset: {
        id: asset._id,
        name: asset.name,
        pin_number: asset.pin_number,
        current_state: asset.current_state
      },
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        availability: parseFloat(availability.toFixed(2)),
        total_runtime: parseFloat(totalRuntime.toFixed(2)),
        total_downtime: parseFloat(totalDowntime.toFixed(2)),
        total_stops: totalStops,
        events_count: events.length
      },
      daily_breakdown: dailyBreakdown,
      events: events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    };

    if (format === 'csv') {
      // Generate CSV
      let csv = 'Asset Report\n';
      csv += `Asset Name,${asset.name}\n`;
      csv += `Asset ID,${asset._id}\n`;
      csv += `Pin Number,${asset.pin_number}\n`;
      csv += `Report Period,${formatDateForCSV(startDate)} to ${formatDateForCSV(endDate)}\n`;
      csv += `Overall Availability,${availability.toFixed(2)}%\n`;
      csv += `Total Runtime,${totalRuntime.toFixed(2)} minutes\n`;
      csv += `Total Downtime,${totalDowntime.toFixed(2)} minutes\n`;
      csv += `Total Stops,${totalStops}\n\n`;

      csv += 'Daily Breakdown\n';
      csv += 'Date,Runtime (min),Downtime (min),Stops,Availability (%)\n';
      dailyBreakdown.forEach(day => {
        csv += `${day.date},${day.runtime.toFixed(2)},${day.downtime.toFixed(2)},${day.stops},${day.availability}\n`;
      });

      csv += '\nEvents\n';
      csv += 'Timestamp,Event Type,State,Runtime (min),Downtime (min),Notes\n';
      events.forEach(event => {
        csv += `${formatDateForCSV(event.timestamp)},${event.event_type || ''},${event.state || ''},${(event.runtime || 0).toFixed(2)},${(event.downtime || 0).toFixed(2)},"${event.notes || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="asset_report_${asset.name}_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    res.status(200).json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Error getting monthly reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly reports',
      error: error.message
    });
  }
};

// @desc    Get shift reports for Archives page
// @route   GET /api/reports/shifts
// @access  Private
exports.getShiftReports = async (req, res) => {
  try {
    console.log('\n\n🚀🚀🚀 DEBUG - getShiftReports FUNCTION CALLED 🚀🚀🚀');
    console.log('🚀 DEBUG - getShiftReports called with query:', req.query);
    const { page = 1, limit = 10, search = '', startDate, endDate } = req.query;
    
    // Import reportService to get archived shift reports
    const reportService = require('../services/reportService');
    
    // Get archived shift reports using the report service
    const options = {};
    if (startDate && endDate) {
      options.startDate = startDate;
      options.endDate = endDate;
    }
    
    let shiftReportArchives = await reportService.getArchivedShiftReports(options);
    
    // Apply search filter if provided
    if (search) {
      shiftReportArchives = shiftReportArchives.filter(archive => 
        archive.title.toLowerCase().includes(search.toLowerCase()) ||
        (archive.description && archive.description.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedReports = shiftReportArchives.slice(startIndex, endIndex);
    
    // Transform archived reports to match frontend expectations
    const shiftReports = paginatedReports.map(archive => {
      const archivedData = archive.archived_data || {};
      const metrics = archivedData.shift_metrics || archivedData; // Support both old and new structure
      const meta = archivedData.generation_metadata || archivedData; // Support both old and new structure

      // DEBUG: Log the data being processed
      console.log('DEBUG - Processing archive:', {
        id: archive.id,
        title: archive.title,
        date_range_start: archive.date_range_start,
        date_range_end: archive.date_range_end,
        metrics_shift_duration: metrics.shift_duration,
        meta_shift_duration_ms: meta.shift_duration_ms,
        has_shift_metrics: !!archivedData.shift_metrics,
        has_generation_metadata: !!archivedData.generation_metadata
      });

      // Calculate duration - prefer shift_metrics.shift_duration, then generation_metadata, fallback to date range
      let duration = 0;
      if (metrics.shift_duration) {
        duration = Number(metrics.shift_duration);
        console.log('DEBUG - Using metrics.shift_duration:', duration);
      } else if (meta.shift_duration_ms) {
        duration = Number(meta.shift_duration_ms);
        console.log('DEBUG - Using meta.shift_duration_ms:', duration);
      } else {
        const startTime = archive.date_range_start ? new Date(archive.date_range_start) : null;
        const endTime = archive.date_range_end ? new Date(archive.date_range_end) : null;
        duration = startTime && endTime ? Math.max(0, endTime - startTime) : 0; // ms
        console.log('DEBUG - Calculated from date range:', duration);
      }

      // Helper to normalize percentage values (allow 0-100 or 0-1)
      const toDecimal = (val) => {
        if (val === undefined || val === null || isNaN(val)) return 0;
        const num = Number(val);
        return num > 1 ? num / 100 : num;
      };

      // Helper to normalize time to minutes when source may be ms or minutes
      const toMinutes = (val, fallbackDurationMs = 0) => {
        if (val === undefined || val === null || isNaN(val)) return 0;
        const num = Number(val);
        // If clearly ms (>= 60,000), convert
        if (num >= 60000) return num / 60000;
        // If small positive and we have a real duration (> 1 minute), assume minutes
        if (num > 0 && fallbackDurationMs >= 60000 && num < 10000) return num;
        // Fallback assume ms
        return num / 60000;
      };

      // Prefer explicit fields, fall back to *_percentage, then 0
      const availability = toDecimal(
        metrics.availability ?? metrics.availability_percentage
      );
      const performance = toDecimal(
        metrics.performance ?? metrics.performance_percentage
      );
      const quality = toDecimal(
        metrics.quality ?? metrics.quality_percentage
      );
      const oee = toDecimal(
        metrics.oee ?? metrics.oee_percentage
      );

      // Runtime/Downtime: prefer minutes if present, else derive from ms totals (with smart fallback)
      const runtime = metrics.runtime_minutes !== undefined
        ? Math.round(Number(metrics.runtime_minutes))
        : (metrics.total_runtime !== undefined ? Math.round(toMinutes(metrics.total_runtime, duration)) : 0);

      const downtime = metrics.downtime_minutes !== undefined
        ? Math.round(Number(metrics.downtime_minutes))
        : (metrics.total_downtime !== undefined ? Math.round(toMinutes(metrics.total_downtime, duration)) : 0);

      const stops = metrics.total_stops !== undefined ? Number(metrics.total_stops) : 0;

      return {
        id: archive.id,
        archive_id: archive.id,
        shift_id: archivedData.shift_id, // For dropdown filtering and linkage
        title: archive.title,
        description: archivedData.description || archive.description,
        name: archive.title, // For compatibility with frontend
        shift_number: 'N/A',
        start_time: archive.date_range_start,
        end_time: archive.date_range_end || (archive.date_range_start && duration > 0 ? new Date(new Date(archive.date_range_start).getTime() + duration).toISOString() : null),
        created_at: archive.created_at,
        status: archive.status,
        archive_type: archive.archive_type,
        duration,
        availability,
        performance,
        quality,
        oee,
        runtime,
        run_time: runtime, // Add run_time field for frontend compatibility
        downtime,
        stops,
        events_processed: meta.events_processed || 0,
        assets_analyzed: meta.assets_analyzed || 0
      };
    });
    
    res.status(200).json({
      success: true,
      data: shiftReports,
      total: shiftReportArchives.length,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(shiftReportArchives.length / limit),
        total_items: shiftReportArchives.length,
        items_per_page: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error getting shift reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shift reports',
      error: error.message
    });
  }
};

// @desc    Get daily reports for Archives page
// @route   GET /api/reports/daily
// @access  Private
exports.getDailyReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', startDate, endDate } = req.query;
    const events = await databaseService.getAllEvents();
    const assets = await databaseService.getAllAssets();
    
    // Group events by date
    const dailyData = {};
    
    events.forEach(event => {
      const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
      if (!dailyData[eventDate]) {
        dailyData[eventDate] = {
          date: eventDate,
          events: [],
          runtime: 0,
          downtime: 0,
          stops: 0,
          starts: 0
        };
      }
      
      dailyData[eventDate].events.push(event);
      dailyData[eventDate].runtime += event.runtime || 0;
      dailyData[eventDate].downtime += event.downtime || 0;
      
      if (event.event_type === 'STOP') dailyData[eventDate].stops++;
      if (event.event_type === 'START') dailyData[eventDate].starts++;
    });
    
    let dailyReports = Object.values(dailyData).map(day => ({
      ...day,
      total_time: day.runtime + day.downtime,
      availability: day.runtime + day.downtime > 0 ? 
        (day.runtime / (day.runtime + day.downtime)) * 100 : 0,
      events_count: day.events.length
    }));
    
    // Apply date filter
    if (startDate && endDate) {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];
      dailyReports = dailyReports.filter(report => 
        report.date >= start && report.date <= end
      );
    }
    
    // Apply search filter
    if (search) {
      dailyReports = dailyReports.filter(report => 
        report.date.includes(search)
      );
    }
    
    // Sort by date (newest first)
    dailyReports.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedReports = dailyReports.slice(startIndex, endIndex);
    
    res.status(200).json({
      success: true,
      data: paginatedReports,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(dailyReports.length / limit),
        total_items: dailyReports.length,
        items_per_page: parseInt(limit)
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

// @desc    Generate and archive shift report
// @route   POST /api/reports/shift/:id/archive
// @access  Private
exports.generateAndArchiveShiftReport = async (req, res) => {
  try {
    const { id } = req.params;
    const reportService = require('../services/reportService');
    
    console.log('🎯 API ENDPOINT: generateAndArchiveShiftReport called with shift ID:', id);
    console.log('🎯 API ENDPOINT: Request params:', req.params);
    console.log('🎯 API ENDPOINT: Request body:', req.body);
    
    // Generate and archive the shift report
    console.log('🎯 API ENDPOINT: About to call reportService.generateAndArchiveShiftReportFromShift...');
    const result = await reportService.generateAndArchiveShiftReportFromShift(id, {
      includeEvents: true,
      includeAssets: true
    });
    console.log('🎯 API ENDPOINT: reportService call completed successfully');
    
    res.status(200).json({
      success: true,
      message: 'Shift report generated and archived successfully',
      data: result
    });
    
  } catch (error) {
    console.error('❌ API ENDPOINT ERROR: Error generating and archiving shift report:', error.message);
    console.error('❌ API ENDPOINT ERROR: Stack trace:', error.stack);
    console.error('❌ API ENDPOINT ERROR: Full error object:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate and archive shift report',
      error: error.message
    });
  }
};

// @desc    Get monthly reports for Archives page
// @route   GET /api/reports/monthly
// @access  Private
exports.getMonthlyReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', startDate, endDate } = req.query;
    const events = await databaseService.getAllEvents();
    const shifts = await databaseService.getAllShifts();
    
    // Group data by month
    const monthlyData = {};
    
    events.forEach(event => {
      const eventDate = new Date(event.timestamp);
      const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          events: [],
          shifts: [],
          runtime: 0,
          downtime: 0,
          stops: 0,
          starts: 0
        };
      }
      
      monthlyData[monthKey].events.push(event);
      monthlyData[monthKey].runtime += event.runtime || 0;
      monthlyData[monthKey].downtime += event.downtime || 0;
      
      if (event.event_type === 'STOP') monthlyData[monthKey].stops++;
      if (event.event_type === 'START') monthlyData[monthKey].starts++;
    });
    
    shifts.forEach(shift => {
      const shiftDate = new Date(shift.start_time);
      const monthKey = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].shifts.push(shift);
      }
    });
    
    let monthlyReports = Object.values(monthlyData).map(month => ({
      ...month,
      total_time: month.runtime + month.downtime,
      availability: month.runtime + month.downtime > 0 ? 
        (month.runtime / (month.runtime + month.downtime)) * 100 : 0,
      events_count: month.events.length,
      shifts_count: month.shifts.length
    }));
    
    // Apply date filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      monthlyReports = monthlyReports.filter(report => {
        const [year, month] = report.month.split('-');
        const reportDate = new Date(year, month - 1, 1);
        return reportDate >= start && reportDate <= end;
      });
    }
    
    // Apply search filter
    if (search) {
      monthlyReports = monthlyReports.filter(report => 
        report.month.includes(search)
      );
    }
    
    // Sort by month (newest first)
    monthlyReports.sort((a, b) => b.month.localeCompare(a.month));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedReports = monthlyReports.slice(startIndex, endIndex);
    
    res.status(200).json({
      success: true,
      data: paginatedReports,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(monthlyReports.length / limit),
        total_items: monthlyReports.length,
        items_per_page: parseInt(limit)
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

// @desc    Export shift reports as CSV
// @route   GET /api/reports/shifts/export
// @access  Private
exports.exportShiftReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const shifts = await databaseService.getAllShifts();
    
    let filteredShifts = shifts;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredShifts = filteredShifts.filter(shift => {
        const shiftDate = new Date(shift.start_time);
        return shiftDate >= start && shiftDate <= end;
      });
    }
    
    filteredShifts.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    
    let csv = 'Shift Reports Export\n';
    csv += `Export Date,${new Date().toISOString()}\n`;
    if (startDate && endDate) {
      csv += `Date Range,${startDate} to ${endDate}\n`;
    }
    csv += '\n';
    csv += 'Shift Name,Shift Number,Start Time,End Time,Duration (min),Availability (%),Runtime (min),Downtime (min),Stops,Active\n';
    
    filteredShifts.forEach(shift => {
      const duration = shift.end_time ? 
        getTimeDifferenceInMinutes(shift.start_time, shift.end_time) : 
        getTimeDifferenceInMinutes(shift.start_time, new Date());
      
      csv += `${shift.name},${shift.shift_number},${formatDateForCSV(shift.start_time)},${shift.end_time ? formatDateForCSV(shift.end_time) : 'Ongoing'},${duration.toFixed(2)},${(shift.availability || 0).toFixed(2)},${(shift.runtime || 0).toFixed(2)},${(shift.downtime || 0).toFixed(2)},${shift.stops || 0},${shift.active ? 'Yes' : 'No'}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    const currentDate = new Date();
    const enhancedFilename = `${currentDate.toISOString().split('T')[0]}_${currentDate.toTimeString().split(' ')[0].replace(/:/g, '-')}_All_Shift_Reports.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${enhancedFilename}"`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error exporting shift reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export shift reports',
      error: error.message
    });
  }
};

// @desc    Export daily reports as CSV
// @route   GET /api/reports/daily/export
// @access  Private
exports.exportDailyReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const events = await databaseService.getAllEvents();
    
    // Group events by date
    const dailyData = {};
    
    events.forEach(event => {
      const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
      if (!dailyData[eventDate]) {
        dailyData[eventDate] = {
          date: eventDate,
          runtime: 0,
          downtime: 0,
          stops: 0,
          starts: 0,
          events_count: 0
        };
      }
      
      dailyData[eventDate].runtime += event.runtime || 0;
      dailyData[eventDate].downtime += event.downtime || 0;
      dailyData[eventDate].events_count++;
      
      if (event.event_type === 'STOP') dailyData[eventDate].stops++;
      if (event.event_type === 'START') dailyData[eventDate].starts++;
    });
    
    let dailyReports = Object.values(dailyData);
    
    if (startDate && endDate) {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];
      dailyReports = dailyReports.filter(report => 
        report.date >= start && report.date <= end
      );
    }
    
    dailyReports.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let csv = 'Daily Reports Export\n';
    csv += `Export Date,${new Date().toISOString()}\n`;
    if (startDate && endDate) {
      csv += `Date Range,${startDate} to ${endDate}\n`;
    }
    csv += '\n';
    csv += 'Date,Runtime (min),Downtime (min),Total Time (min),Availability (%),Starts,Stops,Events Count\n';
    
    dailyReports.forEach(report => {
      const totalTime = report.runtime + report.downtime;
      const availability = totalTime > 0 ? (report.runtime / totalTime) * 100 : 0;
      
      csv += `${report.date},${report.runtime.toFixed(2)},${report.downtime.toFixed(2)},${totalTime.toFixed(2)},${availability.toFixed(2)},${report.starts},${report.stops},${report.events_count}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="daily_reports_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error exporting daily reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export daily reports',
      error: error.message
    });
  }
};

// @desc    Export monthly reports as CSV
// @route   GET /api/reports/monthly/export
// @access  Private
exports.exportMonthlyReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const events = await databaseService.getAllEvents();
    const shifts = await databaseService.getAllShifts();
    
    // Group data by month
    const monthlyData = {};
    
    events.forEach(event => {
      const eventDate = new Date(event.timestamp);
      const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          runtime: 0,
          downtime: 0,
          stops: 0,
          starts: 0,
          events_count: 0,
          shifts_count: 0
        };
      }
      
      monthlyData[monthKey].runtime += event.runtime || 0;
      monthlyData[monthKey].downtime += event.downtime || 0;
      monthlyData[monthKey].events_count++;
      
      if (event.event_type === 'STOP') monthlyData[monthKey].stops++;
      if (event.event_type === 'START') monthlyData[monthKey].starts++;
    });
    
    shifts.forEach(shift => {
      const shiftDate = new Date(shift.start_time);
      const monthKey = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].shifts_count++;
      }
    });
    
    let monthlyReports = Object.values(monthlyData);
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      monthlyReports = monthlyReports.filter(report => {
        const [year, month] = report.month.split('-');
        const reportDate = new Date(year, month - 1, 1);
        return reportDate >= start && reportDate <= end;
      });
    }
    
    monthlyReports.sort((a, b) => b.month.localeCompare(a.month));
    
    let csv = 'Monthly Reports Export\n';
    csv += `Export Date,${new Date().toISOString()}\n`;
    if (startDate && endDate) {
      csv += `Date Range,${startDate} to ${endDate}\n`;
    }
    csv += '\n';
    csv += 'Month,Runtime (min),Downtime (min),Total Time (min),Availability (%),Starts,Stops,Events Count,Shifts Count\n';
    
    monthlyReports.forEach(report => {
      const totalTime = report.runtime + report.downtime;
      const availability = totalTime > 0 ? (report.runtime / totalTime) * 100 : 0;
      
      csv += `${report.month},${report.runtime.toFixed(2)},${report.downtime.toFixed(2)},${totalTime.toFixed(2)},${availability.toFixed(2)},${report.starts},${report.stops},${report.events_count},${report.shifts_count}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="monthly_reports_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Generate and download shift report
// @route   GET /api/reports/shift/:id
// @access  Private
exports.generateShiftReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    // Get shift
    const shift = await databaseService.findShiftById(id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Get all assets and events
    const assets = await databaseService.getAllAssets();
    const allEvents = await databaseService.getAllEvents();

    // Get events for this shift (events between shift start and end time)
    const shiftEvents = allEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      const shiftStart = new Date(shift.start_time);
      const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
      return eventDate >= shiftStart && eventDate <= shiftEnd;
    });

    // Calculate shift duration
    const duration = shift.end_time ? 
      getTimeDifferenceInMinutes(shift.start_time, shift.end_time) : 
      getTimeDifferenceInMinutes(shift.start_time, new Date());

    // Group events by asset
    const assetData = {};
    assets.forEach(asset => {
      assetData[asset._id] = {
        asset_id: asset._id,
        asset_name: asset.name,
        pin_number: asset.pin_number,
        runtime: 0,
        downtime: 0,
        stops: 0,
        events: []
      };
    });

    shiftEvents.forEach(event => {
      const assetId = event.asset;
      if (assetData[assetId]) {
        assetData[assetId].runtime += event.runtime || 0;
        assetData[assetId].downtime += event.downtime || 0;
        if (event.event_type === 'STOP') {
          assetData[assetId].stops++;
        }
        assetData[assetId].events.push(event);
      }
    });

    // Calculate availability for each asset
    const assetSummary = Object.values(assetData).map(asset => {
      const totalTime = asset.runtime + asset.downtime;
      const availability = totalTime > 0 ? (asset.runtime / totalTime) * 100 : 0;
      return {
        ...asset,
        availability: parseFloat(availability.toFixed(2))
      };
    }).sort((a, b) => b.availability - a.availability);

    // Calculate overall shift metrics
    const totalRuntime = assetSummary.reduce((sum, asset) => sum + asset.runtime, 0);
    const totalDowntime = assetSummary.reduce((sum, asset) => sum + asset.downtime, 0);
    const totalStops = assetSummary.reduce((sum, asset) => sum + asset.stops, 0);
    const totalTime = totalRuntime + totalDowntime;
    const overallAvailability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;

    const reportData = {
      shift: {
        id: shift._id,
        name: shift.name,
        shift_number: shift.shift_number,
        start_time: shift.start_time,
        end_time: shift.end_time,
        duration: parseFloat(duration.toFixed(2)),
        active: shift.active,
        notes: shift.notes
      },
      summary: {
        overall_availability: parseFloat(overallAvailability.toFixed(2)),
        total_runtime: parseFloat(totalRuntime.toFixed(2)),
        total_downtime: parseFloat(totalDowntime.toFixed(2)),
        total_stops: totalStops,
        events_count: shiftEvents.length,
        assets_count: assets.length
      },
      assets: assetSummary,
      events: shiftEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    };

    if (format === 'csv') {
      // Generate CSV
      let csv = 'Shift Report\n';
      csv += `Shift Name,${shift.name}\n`;
      csv += `Shift Number,${shift.shift_number}\n`;
      csv += `Start Time,${formatDateForCSV(shift.start_time)}\n`;
      csv += `End Time,${shift.end_time ? formatDateForCSV(shift.end_time) : 'Ongoing'}\n`;
      csv += `Duration,${duration.toFixed(2)} minutes\n`;
      csv += `Overall Availability,${overallAvailability.toFixed(2)}%\n`;
      csv += `Total Runtime,${totalRuntime.toFixed(2)} minutes\n`;
      csv += `Total Downtime,${totalDowntime.toFixed(2)} minutes\n`;
      csv += `Total Stops,${totalStops}\n`;
      csv += `Notes,"${shift.notes || ''}"\n\n`;

      csv += 'Asset Summary\n';
      csv += 'Asset Name,Pin Number,Runtime (min),Downtime (min),Stops,Availability (%)\n';
      assetSummary.forEach(asset => {
        csv += `${asset.asset_name},${asset.pin_number},${asset.runtime.toFixed(2)},${asset.downtime.toFixed(2)},${asset.stops},${asset.availability}\n`;
      });

      csv += '\nEvents\n';
      csv += 'Timestamp,Asset,Event Type,State,Runtime (min),Downtime (min),Notes\n';
      shiftEvents.forEach(event => {
        const asset = assets.find(a => a._id == event.asset);
        csv += `${formatDateForCSV(event.timestamp)},${asset ? asset.name : 'Unknown'},${event.event_type || ''},${event.state || ''},${(event.runtime || 0).toFixed(2)},${(event.downtime || 0).toFixed(2)},"${event.notes || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${generateEnhancedFilename(shift.name, shift.start_time, 'csv')}"`);
      return res.send(csv);
    }

    res.status(200).json({
      success: true,
      data: reportData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Generate and download overall system report
// @route   GET /api/reports/system
// @access  Private
exports.generateSystemReport = async (req, res) => {
  try {
    const { start_date, end_date, format = 'json' } = req.query;

    // Set date range (default to last 30 days)
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date ? new Date(start_date) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all data
    const assets = await databaseService.getAllAssets();
    const shifts = await databaseService.getAllShifts();
    const allEvents = await databaseService.getAllEvents();

    // Filter events by date range
    const events = allEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    });

    // Filter shifts by date range
    const shiftsInRange = shifts.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      return shiftDate >= startDate && shiftDate <= endDate;
    });

    // Calculate overall system metrics
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

    // Asset performance summary
    const assetPerformance = assets.map(asset => {
      const assetEvents = events.filter(event => event.asset == asset._id);
      
      let assetRuntime = 0;
      let assetDowntime = 0;
      let assetStops = 0;

      assetEvents.forEach(event => {
        assetRuntime += event.runtime || 0;
        assetDowntime += event.downtime || 0;
        if (event.event_type === 'STOP') {
          assetStops++;
        }
      });

      // Use asset's current metrics if no events in range
      if (assetEvents.length === 0) {
        assetRuntime = asset.runtime || 0;
        assetDowntime = asset.downtime || 0;
        assetStops = asset.total_stops || 0;
      }

      const assetTotalTime = assetRuntime + assetDowntime;
      const assetAvailability = assetTotalTime > 0 ? (assetRuntime / assetTotalTime) * 100 : 0;

      return {
        asset_id: asset._id,
        name: asset.name,
        pin_number: asset.pin_number,
        current_state: asset.current_state,
        availability: parseFloat(assetAvailability.toFixed(2)),
        runtime: parseFloat(assetRuntime.toFixed(2)),
        downtime: parseFloat(assetDowntime.toFixed(2)),
        stops: assetStops,
        events_count: assetEvents.length
      };
    }).sort((a, b) => b.availability - a.availability);

    // Shift performance summary
    const shiftPerformance = shiftsInRange.map(shift => {
      const duration = shift.end_time ? 
        getTimeDifferenceInMinutes(shift.start_time, shift.end_time) : 
        getTimeDifferenceInMinutes(shift.start_time, new Date());

      return {
        shift_id: shift._id,
        name: shift.name,
        shift_number: shift.shift_number,
        start_time: shift.start_time,
        end_time: shift.end_time,
        duration: parseFloat(duration.toFixed(2)),
        availability: parseFloat((shift.availability || 0).toFixed(2)),
        runtime: parseFloat((shift.runtime || 0).toFixed(2)),
        downtime: parseFloat((shift.downtime || 0).toFixed(2)),
        stops: shift.stops || 0
      };
    }).sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    // Event statistics
    const eventStats = {
      total: events.length,
      starts: events.filter(e => e.event_type === 'START').length,
      stops: events.filter(e => e.event_type === 'STOP').length,
      shifts: events.filter(e => e.event_type === 'SHIFT').length
    };

    const reportData = {
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      system_summary: {
        total_assets: assets.length,
        active_assets: activeAssets,
        overall_availability: parseFloat(overallAvailability.toFixed(2)),
        total_runtime: parseFloat(totalRuntime.toFixed(2)),
        total_downtime: parseFloat(totalDowntime.toFixed(2)),
        total_stops: totalStops,
        total_shifts: shiftsInRange.length
      },
      event_statistics: eventStats,
      asset_performance: assetPerformance,
      shift_performance: shiftPerformance,
      recent_events: events
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50) // Last 50 events
    };

    if (format === 'csv') {
      // Generate CSV
      let csv = 'System Report\n';
      csv += `Report Period,${formatDateForCSV(startDate)} to ${formatDateForCSV(endDate)}\n`;
      csv += `Total Assets,${assets.length}\n`;
      csv += `Active Assets,${activeAssets}\n`;
      csv += `Overall Availability,${overallAvailability.toFixed(2)}%\n`;
      csv += `Total Runtime,${totalRuntime.toFixed(2)} minutes\n`;
      csv += `Total Downtime,${totalDowntime.toFixed(2)} minutes\n`;
      csv += `Total Stops,${totalStops}\n`;
      csv += `Total Shifts,${shiftsInRange.length}\n\n`;

      csv += 'Asset Performance\n';
      csv += 'Asset Name,Pin Number,Current State,Availability (%),Runtime (min),Downtime (min),Stops,Events\n';
      assetPerformance.forEach(asset => {
        csv += `${asset.name},${asset.pin_number},${asset.current_state},${asset.availability},${asset.runtime},${asset.downtime},${asset.stops},${asset.events_count}\n`;
      });

      csv += '\nShift Performance\n';
      csv += 'Shift Name,Shift Number,Start Time,End Time,Duration (min),Availability (%),Runtime (min),Downtime (min),Stops\n';
      shiftPerformance.forEach(shift => {
        csv += `${shift.name},${shift.shift_number},${formatDateForCSV(shift.start_time)},${shift.end_time ? formatDateForCSV(shift.end_time) : 'Ongoing'},${shift.duration},${shift.availability},${shift.runtime},${shift.downtime},${shift.stops}\n`;
      });

      csv += '\nRecent Events\n';
      csv += 'Timestamp,Asset,Event Type,State,Runtime (min),Downtime (min),Notes\n';
      reportData.recent_events.forEach(event => {
        const asset = assets.find(a => a._id == event.asset);
        csv += `${formatDateForCSV(event.timestamp)},${asset ? asset.name : 'Unknown'},${event.event_type || ''},${event.state || ''},${(event.runtime || 0).toFixed(2)},${(event.downtime || 0).toFixed(2)},"${event.notes || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="system_report_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    res.status(200).json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Error getting system report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system report',
      error: error.message
    });
  }
};

// @desc    Get available reports list
// @route   GET /api/reports
// @access  Private
exports.getAvailableReports = async (req, res) => {
  try {
    const assets = await databaseService.getAllAssets();
    const shifts = await databaseService.getAllShifts();

    const availableReports = {
      asset_reports: assets.map(asset => ({
        asset_id: asset.id || asset._id,
        asset_name: asset.name,
        pin_number: asset.pin_number,
        current_state: asset.current_state
      })),
      shift_reports: shifts.map(shift => ({
        shift_id: shift.id || shift._id,
        shift_name: shift.shift_name || shift.name,
        shift_number: shift.shift_number,
        start_time: shift.start_time,
        end_time: shift.end_time,
        active: shift.status === 'active'
      })).sort((a, b) => new Date(b.start_time) - new Date(a.start_time)),
      system_reports: [
        {
          type: 'system',
          name: 'Overall System Report',
          description: 'Comprehensive report covering all assets and shifts'
        }
      ]
    };

    res.status(200).json({
      success: true,
      data: availableReports
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};