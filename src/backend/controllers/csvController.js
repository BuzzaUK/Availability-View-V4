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
    const { 
      type, 
      format = 'standard', 
      filters = {},
      dateRange = {},
      customFields = [],
      exportFormat = 'csv',
      includeHeaders = true,
      delimiter = ','
    } = req.body;
    
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
    
    // Get data based on template data source with advanced filtering
    switch (templateConfig.data_source) {
      case 'assets':
        data = await databaseService.getAllAssets();
        // Apply asset-specific filters
        if (filters.status) {
          data = data.filter(asset => asset.current_state === filters.status);
        }
        if (filters.availability_min) {
          data = data.filter(asset => asset.availability_percentage >= filters.availability_min);
        }
        break;
        
      case 'events':
        data = await databaseService.getAllEvents();
        // Apply date range filtering for events
        if (dateRange.startDate || dateRange.endDate) {
          data = data.filter(event => {
            const eventDate = new Date(event.timestamp);
            if (dateRange.startDate && eventDate < new Date(dateRange.startDate)) return false;
            if (dateRange.endDate && eventDate > new Date(dateRange.endDate)) return false;
            return true;
          });
        }
        // Apply event type filtering
        if (filters.eventTypes && filters.eventTypes.length > 0) {
          data = data.filter(event => filters.eventTypes.includes(event.event_type));
        }
        // Apply asset filtering
        if (filters.assetNames && filters.assetNames.length > 0) {
          data = data.filter(event => filters.assetNames.includes(event.asset_name));
        }
        break;
        
      case 'shifts':
        data = await databaseService.getAllShifts();
        // Apply date range filtering for shifts
        if (dateRange.startDate || dateRange.endDate) {
          data = data.filter(shift => {
            const shiftDate = new Date(shift.start_time);
            if (dateRange.startDate && shiftDate < new Date(dateRange.startDate)) return false;
            if (dateRange.endDate && shiftDate > new Date(dateRange.endDate)) return false;
            return true;
          });
        }
        // Apply shift status filtering
        if (filters.status) {
          data = data.filter(shift => shift.status === filters.status);
        }
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

    // Apply custom field selection if provided
    let fieldsToUse = templateConfig.fields;
    if (customFields && customFields.length > 0) {
      fieldsToUse = templateConfig.fields.filter(field => 
        customFields.includes(field.key) || customFields.includes(field.label)
      );
    }

    // Apply transformations if defined
    if (templateConfig.transformations) {
      data = applyTransformations(data, templateConfig.transformations);
    }

    // Generate export data based on format
    let exportData, contentType, fileExtension;
    
    switch (exportFormat.toLowerCase()) {
      case 'json':
        exportData = JSON.stringify(data.map(row => {
          const filteredRow = {};
          fieldsToUse.forEach(field => {
            filteredRow[field.label] = row[field.key] || '';
          });
          return filteredRow;
        }), null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
        break;
        
      case 'xml':
        exportData = generateXML(data, fieldsToUse);
        contentType = 'application/xml';
        fileExtension = 'xml';
        break;
        
      case 'excel':
        exportData = generateExcel(data, fieldsToUse, includeHeaders);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
        
      default: // CSV
        exportData = generateCSV(data, fieldsToUse, delimiter, includeHeaders);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
    }
    
    // Set response headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${type}_export_${timestamp}.${fileExtension}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.status(200).send(exportData);

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

// Helper function to generate CSV from data
function generateCSV(data, fields, delimiter = ',', includeHeaders = true) {
  if (!data || data.length === 0) {
    return includeHeaders ? fields.map(field => field.label).join(delimiter) + '\n' : '';
  }

  const headers = fields.map(field => field.label);
  const rows = data.map(item => {
    return fields.map(field => {
      const value = item[field.key] || '';
      // Escape quotes and wrap in quotes if contains delimiter or quote
      if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(delimiter);
  });

  const result = includeHeaders ? [headers.join(delimiter), ...rows] : rows;
  return result.join('\n');
}

// Helper function to generate XML from data
function generateXML(data, fields) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';
  
  data.forEach(item => {
    xml += '  <record>\n';
    fields.forEach(field => {
      const value = item[field.key] || '';
      const escapedValue = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      xml += `    <${field.key}>${escapedValue}</${field.key}>\n`;
    });
    xml += '  </record>\n';
  });
  
  xml += '</data>';
  return xml;
}

// Helper function to generate Excel-compatible CSV (placeholder for future Excel library integration)
function generateExcel(data, fields, includeHeaders = true) {
  // For now, return enhanced CSV format that Excel can read
  // In the future, this could use a library like xlsx to generate actual Excel files
  const csvData = generateCSV(data, fields, ',', includeHeaders);
  
  // Add BOM for proper UTF-8 encoding in Excel
  return '\uFEFF' + csvData;
}

// Helper function to apply transformations to data
 function applyTransformations(data, transformations) {
   return data.map(item => {
     const transformedItem = { ...item };
     
     transformations.forEach(transform => {
       switch (transform.type) {
         case 'calculate_field':
           // Simple formula evaluation for basic calculations
           try {
             const formula = transform.formula.replace(/([a-zA-Z_][a-zA-Z0-9_]*)/g, (match) => {
               return transformedItem[match] !== undefined ? transformedItem[match] : 0;
             });
             // Use Function constructor for safer evaluation than eval
             const result = new Function('return ' + formula)();
             transformedItem[transform.target_field] = isNaN(result) ? 0 : Math.round(result * 100) / 100;
           } catch (e) {
             transformedItem[transform.target_field] = 0;
           }
           break;
         case 'format_date':
           if (transformedItem[transform.field]) {
             const date = new Date(transformedItem[transform.field]);
             transformedItem[transform.field] = date.toLocaleDateString();
           }
           break;
         case 'convert_ms_to_hours':
           if (transformedItem[transform.field]) {
             transformedItem[transform.field] = (transformedItem[transform.field] / (1000 * 60 * 60)).toFixed(2);
           }
           break;
         case 'convert_ms_to_minutes':
           if (transformedItem[transform.field]) {
             transformedItem[transform.field] = (transformedItem[transform.field] / (1000 * 60)).toFixed(2);
           }
           break;
         case 'round_number':
           if (transformedItem[transform.field] && !isNaN(transformedItem[transform.field])) {
             transformedItem[transform.field] = Math.round(parseFloat(transformedItem[transform.field]) * 100) / 100;
           }
           break;
         case 'uppercase':
           if (transformedItem[transform.field]) {
             transformedItem[transform.field] = transformedItem[transform.field].toString().toUpperCase();
           }
           break;
         case 'lowercase':
           if (transformedItem[transform.field]) {
             transformedItem[transform.field] = transformedItem[transform.field].toString().toLowerCase();
           }
           break;
       }
     });
     
     return transformedItem;
   });
 }

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