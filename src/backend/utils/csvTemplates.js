/**
 * CSV Template Management Utility
 * Provides predefined templates and template management functions
 */

const DEFAULT_TEMPLATES = {
  assets: {
    id: 'assets_standard',
    name: 'Standard Assets Export',
    description: 'Basic asset information with performance metrics',
    data_source: 'assets',
    fields: [
      { key: 'name', label: 'Asset Name' },
      { key: 'pin_number', label: 'Pin Number' },
      { key: 'current_state', label: 'Current State' },
      { key: 'runtime', label: 'Runtime (ms)' },
      { key: 'downtime', label: 'Downtime (ms)' },
      { key: 'total_stops', label: 'Total Stops' },
      { key: 'availability_percentage', label: 'Availability %' },
      { key: 'last_state_change', label: 'Last State Change' }
    ],
    transformations: [
      {
        type: 'calculate_field',
        target_field: 'runtime_hours',
        formula: 'runtime / 3600000'
      },
      {
        type: 'calculate_field',
        target_field: 'downtime_hours',
        formula: 'downtime / 3600000'
      },
      {
        type: 'format_date',
        field: 'last_state_change',
        format: 'YYYY-MM-DD HH:mm:ss'
      }
    ]
  },

  events: {
    id: 'events_standard',
    name: 'Standard Events Export',
    description: 'Event log with asset and timing information',
    data_source: 'events',
    fields: [
      { key: 'asset_name', label: 'Asset Name' },
      { key: 'event_type', label: 'Event Type' },
      { key: 'state', label: 'State' },
      { key: 'duration', label: 'Duration (seconds)' },
      { key: 'is_short_stop', label: 'Short Stop' },
      { key: 'timestamp', label: 'Timestamp' }
    ],
    transformations: [
      {
        type: 'format_date',
        field: 'timestamp',
        format: 'YYYY-MM-DD HH:mm:ss'
      },
      {
        type: 'calculate_field',
        target_field: 'duration_minutes',
        formula: 'duration / 60'
      }
    ]
  },

  shifts: {
    id: 'shifts_standard',
    name: 'Standard Shifts Export',
    description: 'Shift information with performance summary',
    data_source: 'shifts',
    fields: [
      { key: 'name', label: 'Shift Name' },
      { key: 'shift_number', label: 'Shift Number' },
      { key: 'start_time', label: 'Start Time' },
      { key: 'end_time', label: 'End Time' },
      { key: 'status', label: 'Status' },
      { key: 'total_runtime', label: 'Total Runtime (ms)' },
      { key: 'total_downtime', label: 'Total Downtime (ms)' },
      { key: 'total_stops', label: 'Total Stops' },
      { key: 'average_availability', label: 'Average Availability %' }
    ],
    transformations: [
      {
        type: 'format_date',
        field: 'start_time',
        format: 'YYYY-MM-DD HH:mm:ss'
      },
      {
        type: 'format_date',
        field: 'end_time',
        format: 'YYYY-MM-DD HH:mm:ss'
      },
      {
        type: 'calculate_field',
        target_field: 'duration_hours',
        formula: '(new Date(end_time) - new Date(start_time)) / 3600000'
      }
    ]
  },



  advanced_analytics: {
    id: 'advanced_analytics',
    name: 'Advanced Analytics Export',
    description: 'Comprehensive data export with predictive insights and trend analysis',
    data_source: 'assets',
    fields: [
      { key: 'name', label: 'Asset Name' },
      { key: 'current_state', label: 'Current Status' },
      { key: 'availability_percentage', label: 'Availability %' },
      { key: 'runtime', label: 'Runtime (hours)' },
      { key: 'downtime', label: 'Downtime (hours)' },
      { key: 'total_stops', label: 'Total Stops' },
      { key: 'efficiency_score', label: 'Efficiency Score' },
      { key: 'maintenance_due', label: 'Maintenance Due' },
      { key: 'last_maintenance', label: 'Last Maintenance' },
      { key: 'predicted_failure_risk', label: 'Failure Risk %' }
    ],
    transformations: [
      {
        type: 'convert_ms_to_hours',
        field: 'runtime'
      },
      {
        type: 'convert_ms_to_hours',
        field: 'downtime'
      },
      {
        type: 'calculate_field',
        target_field: 'efficiency_score',
        formula: 'availability_percentage * 0.9' // Simplified efficiency
      },
      {
        type: 'calculate_field',
        target_field: 'predicted_failure_risk',
        formula: 'total_stops > 10 ? Math.min(total_stops * 2, 95) : total_stops * 1.5'
      },
      {
        type: 'format_date',
        field: 'last_maintenance'
      }
    ]
  }
};

/**
 * Get all available templates
 */
function getAllTemplates() {
  return Object.values(DEFAULT_TEMPLATES);
}

/**
 * Get template by ID
 */
function getTemplateById(templateId) {
  return Object.values(DEFAULT_TEMPLATES).find(template => template.id === templateId);
}

/**
 * Get templates by data source
 */
function getTemplatesByDataSource(dataSource) {
  return Object.values(DEFAULT_TEMPLATES).filter(template => template.data_source === dataSource);
}

/**
 * Validate template structure
 */
function validateTemplate(template) {
  const required = ['id', 'name', 'data_source', 'fields'];
  const missing = required.filter(field => !template[field]);
  
  if (missing.length > 0) {
    throw new Error(`Template missing required fields: ${missing.join(', ')}`);
  }

  if (!Array.isArray(template.fields) || template.fields.length === 0) {
    throw new Error('Template must have at least one field');
  }

  template.fields.forEach((field, index) => {
    if (!field.key || !field.label) {
      throw new Error(`Field at index ${index} missing key or label`);
    }
  });

  return true;
}

/**
 * Create custom template
 */
function createCustomTemplate(templateData) {
  validateTemplate(templateData);
  
  return {
    ...templateData,
    id: templateData.id || `custom_${Date.now()}`,
    created_at: new Date(),
    is_custom: true
  };
}

module.exports = {
  DEFAULT_TEMPLATES,
  getAllTemplates,
  getTemplateById,
  getTemplatesByDataSource,
  validateTemplate,
  createCustomTemplate
};