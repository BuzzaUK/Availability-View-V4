const fs = require('fs').promises;
const path = require('path');
// Temporarily handle missing csv-parser dependency
let csv;
try {
  csv = require('csv-parser');
} catch (error) {
  console.warn('⚠️ csv-parser not installed. CSV import functionality will be limited.');
  csv = null;
}
const { Parser } = require('json2csv');
const cron = require('node-cron');
const databaseService = require('./databaseService');
const s3Service = require('./s3Service');
const sendEmail = require('../utils/sendEmail');

class CsvEnhancementService {
  constructor() {
    this.scheduledJobs = new Map();
    this.customTemplates = new Map();
    this.exportHistory = [];
    this.csvParserAvailable = !!csv;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Load saved templates and schedules
      await this.loadCustomTemplates();
      await this.loadScheduledJobs();
      console.log('✅ CSV Enhancement Service initialized');
      if (!this.csvParserAvailable) {
        console.warn('⚠️ CSV import functionality limited - install csv-parser for full features');
      }
    } catch (error) {
      console.error('❌ CSV Enhancement Service initialization failed:', error.message);
    }
  }

  /**
   * Create custom CSV template
   */
  async createCustomTemplate(templateData) {
    const {
      name,
      description,
      data_source,
      fields,
      filters,
      transformations,
      created_by
    } = templateData;

    const template = {
      id: `custom_${Date.now()}`,
      name,
      description,
      data_source,
      fields,
      filters: filters || {},
      transformations: transformations || [],
      created_by,
      created_at: new Date(),
      usage_count: 0
    };

    this.customTemplates.set(template.id, template);
    await this.saveCustomTemplates();

    return template;
  }

  /**
   * Generate CSV with advanced options
   */
  async generateAdvancedCsv(options) {
    const {
      template_id,
      custom_fields,
      filters,
      transformations,
      format_options,
      output_options
    } = options;

    try {
      // Get data based on template or custom configuration
      let data = await this.fetchData(options.data_source, filters);

      // Apply transformations
      if (transformations && transformations.length > 0) {
        data = this.applyTransformations(data, transformations);
      }

      // Configure CSV format
      const csvOptions = {
        fields: custom_fields || this.getTemplateFields(template_id),
        delimiter: format_options?.delimiter || ',',
        quote: format_options?.quote || '"',
        escape: format_options?.escape || '"',
        header: format_options?.include_header !== false,
        ...format_options
      };

      // Generate CSV
      const parser = new Parser(csvOptions);
      const csvData = parser.parse(data);

      // Apply post-processing
      const processedCsv = this.postProcessCsv(csvData, output_options);

      // Save to file if requested
      let filePath = null;
      if (output_options?.save_file) {
        filePath = await this.saveCsvFile(processedCsv, output_options.filename);
      }

      // Upload to cloud if requested
      let cloudUrl = null;
      if (output_options?.upload_cloud && filePath) {
        cloudUrl = await this.uploadToCloud(filePath, output_options.cloud_path);
      }

      // Update usage statistics
      if (template_id) {
        this.updateTemplateUsage(template_id);
      }

      return {
        csv_data: processedCsv,
        file_path: filePath,
        cloud_url: cloudUrl,
        record_count: data.length,
        generated_at: new Date()
      };

    } catch (error) {
      console.error('Advanced CSV generation failed:', error);
      throw error;
    }
  }

  /**
   * Bulk import with validation and transformation
   */
  async bulkImport(filePath, importConfig) {
    const {
      data_type,
      validation_rules,
      transformations,
      conflict_resolution,
      batch_size = 100
    } = importConfig;

    const results = {
      total_rows: 0,
      processed: 0,
      created: 0,
      updated: 0,
      errors: [],
      warnings: []
    };

    try {
      // Parse CSV file
      const records = await this.parseCsvFile(filePath);
      results.total_rows = records.length;

      // Process in batches
      for (let i = 0; i < records.length; i += batch_size) {
        const batch = records.slice(i, i + batch_size);
        const batchResults = await this.processBatch(batch, importConfig, i);
        
        results.processed += batchResults.processed;
        results.created += batchResults.created;
        results.updated += batchResults.updated;
        results.errors.push(...batchResults.errors);
        results.warnings.push(...batchResults.warnings);
      }

      // Generate import report
      const reportPath = await this.generateImportReport(results, importConfig);

      return {
        ...results,
        report_path: reportPath,
        success_rate: (results.processed / results.total_rows) * 100
      };

    } catch (error) {
      console.error('Bulk import failed:', error);
      throw error;
    }
  }

  /**
   * Schedule automated exports
   */
  async scheduleAutomatedExport(scheduleConfig) {
    const {
      name,
      template_id,
      cron_expression,
      export_options,
      notification_settings,
      enabled = true
    } = scheduleConfig;

    const scheduleId = `auto_export_${Date.now()}`;

    if (enabled) {
      const job = cron.schedule(cron_expression, async () => {
        try {
          console.log(`🔄 Running automated CSV export: ${name}`);
          
          // Generate export
          const result = await this.generateAdvancedCsv({
            template_id,
            ...export_options
          });

          // Send notifications
          if (notification_settings?.email_recipients) {
            await this.sendExportNotification(result, notification_settings);
          }

          // Log export
          this.logExport(scheduleId, result);

          console.log(`✅ Automated CSV export completed: ${name}`);

        } catch (error) {
          console.error(`❌ Automated CSV export failed: ${name}`, error);
          
          // Send error notification
          if (notification_settings?.notify_on_error) {
            await this.sendErrorNotification(error, notification_settings);
          }
        }
      }, {
        scheduled: true,
        timezone: process.env.TIMEZONE || 'America/New_York'
      });

      this.scheduledJobs.set(scheduleId, {
        job,
        config: scheduleConfig,
        created_at: new Date(),
        last_run: null,
        next_run: this.getNextRunTime(cron_expression)
      });
    }

    await this.saveScheduledJobs();

    return {
      schedule_id: scheduleId,
      ...scheduleConfig,
      status: enabled ? 'active' : 'inactive'
    };
  }

  /**
   * Get export analytics and insights
   */
  async getExportAnalytics(timeRange = '30d') {
    const cutoffDate = new Date();
    const days = parseInt(timeRange.replace('d', ''));
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentExports = this.exportHistory.filter(
      export_ => new Date(export_.timestamp) >= cutoffDate
    );

    const analytics = {
      total_exports: recentExports.length,
      total_records: recentExports.reduce((sum, exp) => sum + exp.record_count, 0),
      average_records_per_export: 0,
      most_used_templates: {},
      export_frequency: this.calculateExportFrequency(recentExports),
      file_size_stats: this.calculateFileSizeStats(recentExports),
      error_rate: this.calculateErrorRate(recentExports)
    };

    if (analytics.total_exports > 0) {
      analytics.average_records_per_export = analytics.total_records / analytics.total_exports;
    }

    // Calculate template usage
    recentExports.forEach(export_ => {
      const template = export_.template_id || 'custom';
      analytics.most_used_templates[template] = (analytics.most_used_templates[template] || 0) + 1;
    });

    return analytics;
  }

  /**
   * Validate CSV data against schema
   */
  validateCsvData(data, validationRules) {
    const errors = [];
    const warnings = [];

    data.forEach((row, index) => {
      // Required field validation
      if (validationRules.required_fields) {
        validationRules.required_fields.forEach(field => {
          if (!row[field] || row[field].toString().trim() === '') {
            errors.push({
              row: index + 1,
              field,
              error: 'Required field is missing or empty'
            });
          }
        });
      }

      // Data type validation
      if (validationRules.field_types) {
        Object.entries(validationRules.field_types).forEach(([field, type]) => {
          if (row[field] && !this.validateFieldType(row[field], type)) {
            errors.push({
              row: index + 1,
              field,
              error: `Invalid data type. Expected ${type}`
            });
          }
        });
      }

      // Custom validation rules
      if (validationRules.custom_rules) {
        validationRules.custom_rules.forEach(rule => {
          const result = this.applyCustomValidation(row, rule, index + 1);
          if (result.errors) errors.push(...result.errors);
          if (result.warnings) warnings.push(...result.warnings);
        });
      }
    });

    return { errors, warnings };
  }

  // Helper methods
  async fetchData(dataSource, filters = {}) {
    switch (dataSource) {
      case 'assets':
        return await databaseService.getAllAssets();
      case 'events':
        let events = await databaseService.getAllEvents();
        return this.applyFilters(events, filters);
      case 'shifts':
        let shifts = await databaseService.getShifts();
        return this.applyFilters(shifts, filters);
      default:
        throw new Error(`Unknown data source: ${dataSource}`);
    }
  }

  applyFilters(data, filters) {
    let filtered = data;

    if (filters.date_range) {
      const { start, end } = filters.date_range;
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp || item.created_at || item.start_time);
        return itemDate >= new Date(start) && itemDate <= new Date(end);
      });
    }

    if (filters.asset_ids) {
      filtered = filtered.filter(item => 
        filters.asset_ids.includes(item.asset || item.asset_id || item._id)
      );
    }

    if (filters.custom_filter) {
      filtered = filtered.filter(item => 
        this.evaluateCustomFilter(item, filters.custom_filter)
      );
    }

    return filtered;
  }

  applyTransformations(data, transformations) {
    let transformed = [...data];

    transformations.forEach(transform => {
      switch (transform.type) {
        case 'calculate_field':
          transformed = transformed.map(row => ({
            ...row,
            [transform.target_field]: this.calculateField(row, transform.formula)
          }));
          break;
        
        case 'format_date':
          transformed = transformed.map(row => ({
            ...row,
            [transform.field]: this.formatDate(row[transform.field], transform.format)
          }));
          break;
        
        case 'convert_units':
          transformed = transformed.map(row => ({
            ...row,
            [transform.field]: this.convertUnits(row[transform.field], transform.from, transform.to)
          }));
          break;
      }
    });

    return transformed;
  }

  async parseCsvFile(filePath) {
    if (!this.csvParserAvailable) {
      throw new Error('CSV parser not available. Please install csv-parser package.');
    }
    
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  // Add stub methods for missing functionality
  async loadCustomTemplates() {
    // Stub implementation
    return Promise.resolve();
  }

  async loadScheduledJobs() {
    // Stub implementation
    return Promise.resolve();
  }

  async saveCustomTemplates() {
    // Stub implementation
    return Promise.resolve();
  }

  async saveScheduledJobs() {
    // Stub implementation
    return Promise.resolve();
  }

  getTemplateFields(templateId) {
    // Return default fields if template not found
    return ['name', 'value', 'timestamp'];
  }

  postProcessCsv(csvData, options) {
    // Basic post-processing
    return csvData;
  }

  async saveCsvFile(csvContent, filename) {
    // Basic file saving
    const filePath = path.join(process.cwd(), 'temp', filename || `export_${Date.now()}.csv`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, csvContent);
    return filePath;
  }

  async uploadToCloud(filePath, cloudPath) {
    // Use existing S3 service if available
    try {
      return await s3Service.uploadFile(cloudPath, await fs.readFile(filePath), 'text/csv');
    } catch (error) {
      console.warn('Cloud upload failed:', error.message);
      return null;
    }
  }

  updateTemplateUsage(templateId) {
    // Update usage statistics
    const template = this.customTemplates.get(templateId);
    if (template) {
      template.usage_count = (template.usage_count || 0) + 1;
    }
  }

  async processBatch(batch, importConfig, startIndex) {
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [],
      warnings: []
    };

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const rowIndex = startIndex + i + 1;

      try {
        // Validate row
        const validation = this.validateCsvData([row], importConfig.validation_rules);
        if (validation.errors.length > 0) {
          results.errors.push(...validation.errors.map(err => ({ ...err, row: rowIndex })));
          continue;
        }

        // Apply transformations
        const transformedRow = this.applyTransformations([row], importConfig.transformations || [])[0];

        // Import based on data type
        const importResult = await this.importRow(transformedRow, importConfig.data_type, importConfig.conflict_resolution);
        
        if (importResult.created) results.created++;
        if (importResult.updated) results.updated++;
        results.processed++;

      } catch (error) {
        results.errors.push({
          row: rowIndex,
          error: error.message
        });
      }
    }

    return results;
  }

  async importRow(row, dataType, conflictResolution) {
    switch (dataType) {
      case 'assets':
        return await this.importAsset(row, conflictResolution);
      case 'users':
        return await this.importUser(row, conflictResolution);
      default:
        throw new Error(`Unsupported import data type: ${dataType}`);
    }
  }

  async importAsset(assetData, conflictResolution) {
    const existing = await databaseService.findAssetByName(assetData.name);
    
    if (existing) {
      if (conflictResolution === 'update') {
        await databaseService.updateAsset(existing._id, assetData);
        return { updated: true };
      } else if (conflictResolution === 'skip') {
        return { skipped: true };
      } else {
        throw new Error(`Asset '${assetData.name}' already exists`);
      }
    } else {
      await databaseService.createAsset(assetData);
      return { created: true };
    }
  }

  // Additional helper methods would continue here...
  
  async shutdown() {
    // Stop all scheduled jobs
    this.scheduledJobs.forEach(({ job }) => {
      if (job && typeof job.stop === 'function') {
        job.stop();
      }
    });
    this.scheduledJobs.clear();
    console.log('✅ CSV Enhancement Service shutdown completed');
  }
}

module.exports = new CsvEnhancementService();