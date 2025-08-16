const databaseService = require('../services/databaseService');
const csvTemplates = require('../utils/csvTemplates');

// @desc    Get available CSV templates
// @route   GET /api/csv/templates
// @access  Private
exports.getTemplates = async (req, res) => {
  try {
    const templates = csvTemplates.getAllTemplates();
    
    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CSV templates',
      error: error.message
    });
  }
};

// @desc    Export data using template (generic endpoint)
// @route   POST /api/csv/export
// @access  Private
exports.exportData = async (req, res) => {
  try {
    const { type, format = 'standard', filters = {} } = req.body;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Data type is required'
      });
    }

    const templateId = `${type}_${format}`;
    const templateConfig = csvTemplates.getTemplateById(templateId) || 
                          csvTemplates.getTemplateById(`${type}_standard`);
    
    if (!templateConfig) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    let data = [];
    
    // Get data based on template data source
    switch (templateConfig.data_source) {
      case 'assets':
        data = await databaseService.getAllAssets();
        break;
      case 'events':
        data = await databaseService.getAllEvents();
        break;
      case 'shifts':
        data = await databaseService.getAllShifts();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid data source'
        });
    }

    // Apply filters if provided
    if (filters.startDate || filters.endDate) {
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      
      data = data.filter(item => {
        const itemDate = new Date(item.timestamp || item.created_at || item.last_state_change);
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        return true;
      });
    }

    // Transform data according to template
    const csvData = data.map(item => {
      const row = {};
      templateConfig.fields.forEach(field => {
        row[field.label] = item[field.key] || '';
      });
      return row;
    });

    // Convert to CSV format
    const headers = templateConfig.fields.map(field => field.label);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csvContent);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
};

// @desc    Export data using template (with template parameter)
// @route   POST /api/csv/export/:template
// @access  Private
exports.exportWithTemplate = async (req, res) => {
  try {
    const { template } = req.params;
    const { filters = {} } = req.body;
    
    const templateConfig = csvTemplates.getTemplateById(template) || 
                          csvTemplates.getTemplateById(`${template}_standard`);
    
    if (!templateConfig) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    let data = [];
    
    // Get data based on template data source
    switch (templateConfig.data_source) {
      case 'assets':
        data = await databaseService.getAllAssets();
        break;
      case 'events':
        data = await databaseService.getAllEvents();
        break;
      case 'shifts':
        data = await databaseService.getAllShifts();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid data source'
        });
    }

    // Apply filters if provided
    if (filters.startDate || filters.endDate) {
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      
      data = data.filter(item => {
        const itemDate = new Date(item.timestamp || item.created_at || item.last_state_change);
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        return true;
      });
    }

    // Transform data according to template
    const csvData = data.map(item => {
      const row = {};
      templateConfig.fields.forEach(field => {
        row[field.label] = item[field.key] || '';
      });
      return row;
    });

    res.status(200).json({
      success: true,
      data: csvData,
      template: templateConfig.name,
      recordCount: csvData.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
};

// @desc    Import data from CSV (generic endpoint)
// @route   POST /api/csv/import
// @access  Private
exports.importData = async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!req.file && !req.body.csvData) {
      return res.status(400).json({
        success: false,
        message: 'No file or CSV data provided'
      });
    }

    let csvData;
    if (req.file) {
      // Handle file upload
      const fileContent = req.file.buffer.toString('utf8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      csvData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
    } else {
      csvData = req.body.csvData;
    }
    
    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CSV data provided'
      });
    }

    const importedItems = [];
    const errors = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        if (type === 'assets') {
          // Basic validation for assets
          if (!row.name || !row.pin_number) {
            errors.push(`Row ${i + 1}: Missing required fields (name, pin_number)`);
            continue;
          }

          const assetData = {
            name: row.name,
            pin_number: parseInt(row.pin_number),
            current_state: row.current_state || 'unknown',
            runtime: parseInt(row.runtime) || 0,
            downtime: parseInt(row.downtime) || 0,
            total_stops: parseInt(row.total_stops) || 0,
            availability_percentage: parseFloat(row.availability_percentage) || 0
          };

          const newAsset = await databaseService.createAsset(assetData);
          importedItems.push(newAsset);
        } else {
          errors.push(`Row ${i + 1}: Unsupported import type: ${type}`);
        }

      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Imported ${importedItems.length} items`,
      data: {
        processed: importedItems.length,
        errors: errors.length,
        errorDetails: errors
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to import data',
      error: error.message
    });
  }
};

// @desc    Import assets from CSV (specific endpoint)
// @route   POST /api/csv/import/assets
// @access  Private
exports.importAssets = async (req, res) => {
  try {
    const { csvData } = req.body;
    
    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CSV data provided'
      });
    }

    const importedAssets = [];
    const errors = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        // Basic validation
        if (!row.name || !row.pin_number) {
          errors.push(`Row ${i + 1}: Missing required fields (name, pin_number)`);
          continue;
        }

        const assetData = {
          name: row.name,
          pin_number: parseInt(row.pin_number),
          current_state: row.current_state || 'unknown',
          runtime: parseInt(row.runtime) || 0,
          downtime: parseInt(row.downtime) || 0,
          total_stops: parseInt(row.total_stops) || 0,
          availability_percentage: parseFloat(row.availability_percentage) || 0
        };

        const newAsset = await databaseService.createAsset(assetData);
        importedAssets.push(newAsset);

      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Imported ${importedAssets.length} assets`,
      data: {
        processed: importedAssets.length,
        errors: errors.length,
        errorDetails: errors
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to import assets',
      error: error.message
    });
  }
};

// @desc    Schedule automated CSV export
// @route   POST /api/csv/schedule
// @access  Private
exports.scheduleExport = async (req, res) => {
  try {
    const { name, template, schedule, filters = {}, email } = req.body;
    
    if (!name || !template || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, template, schedule'
      });
    }

    const scheduledExport = {
      id: Date.now(),
      name,
      template,
      schedule,
      filters,
      email,
      isActive: true,
      created_at: new Date(),
      last_run: null,
      next_run: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
    };

    // Store in memory (in a real app, this would be in a database)
    if (!global.scheduledExports) {
      global.scheduledExports = [];
    }
    global.scheduledExports.push(scheduledExport);

    res.status(201).json({
      success: true,
      message: 'Export scheduled successfully',
      data: scheduledExport
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to schedule export',
      error: error.message
    });
  }
};

// @desc    Create scheduled export (alternative endpoint)
// @route   POST /api/csv/schedules
// @access  Private
exports.createSchedule = async (req, res) => {
  return exports.scheduleExport(req, res);
};

// @desc    Get scheduled exports
// @route   GET /api/csv/schedules
// @access  Private
exports.getSchedules = async (req, res) => {
  try {
    const schedules = global.scheduledExports || [];
    
    res.status(200).json({
      success: true,
      data: schedules
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled exports',
      error: error.message
    });
  }
};

// @desc    Update scheduled export
// @route   PUT /api/csv/schedules/:id
// @access  Private
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!global.scheduledExports) {
      global.scheduledExports = [];
    }

    const scheduleIndex = global.scheduledExports.findIndex(s => s.id === parseInt(id));
    
    if (scheduleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled export not found'
      });
    }

    global.scheduledExports[scheduleIndex] = {
      ...global.scheduledExports[scheduleIndex],
      ...updates,
      updated_at: new Date()
    };

    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: global.scheduledExports[scheduleIndex]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule',
      error: error.message
    });
  }
};

// @desc    Delete scheduled export
// @route   DELETE /api/csv/schedules/:id
// @access  Private
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!global.scheduledExports) {
      global.scheduledExports = [];
    }

    const scheduleIndex = global.scheduledExports.findIndex(s => s.id === parseInt(id));
    
    if (scheduleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled export not found'
      });
    }

    global.scheduledExports.splice(scheduleIndex, 1);

    res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule',
      error: error.message
    });
  }
};

// @desc    Get CSV analytics
// @route   GET /api/csv/analytics
// @access  Private
exports.getAnalytics = async (req, res) => {
  try {
    // Mock analytics data for CSV operations
    const analytics = {
      totalExports: 156,
      totalImports: 23,
      recentActivity: [
        {
          id: 1,
          type: 'export',
          template: 'assets',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          status: 'completed',
          recordCount: 45
        },
        {
          id: 2,
          type: 'import',
          template: 'assets',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          status: 'completed',
          recordCount: 12
        },
        {
          id: 3,
          type: 'export',
          template: 'events',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          status: 'completed',
          recordCount: 234
        }
      ],
      popularTemplates: [
        { name: 'assets', usage: 45 },
        { name: 'events', usage: 32 },
        { name: 'performance', usage: 28 },
        { name: 'shifts', usage: 15 }
      ]
    };

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CSV analytics',
      error: error.message
    });
  }
};

module.exports = {
  getTemplates: exports.getTemplates,
  exportData: exports.exportData,
  exportWithTemplate: exports.exportWithTemplate,
  importData: exports.importData,
  importAssets: exports.importAssets,
  scheduleExport: exports.scheduleExport,
  createSchedule: exports.createSchedule,
  getSchedules: exports.getSchedules,
  updateSchedule: exports.updateSchedule,
  deleteSchedule: exports.deleteSchedule,
  getAnalytics: exports.getAnalytics
};