const logger = require('../utils/logger');

/**
 * Environment-specific configuration and error handling
 */
const environmentHandler = {
  // Development environment settings
  development: {
    logLevel: 'debug',
    showStackTrace: true,
    detailedErrors: true,
    enableCors: true,
    corsOrigin: 'http://localhost:3000'
  },

  // Production environment settings
  production: {
    logLevel: 'error',
    showStackTrace: false,
    detailedErrors: false,
    enableCors: true,
    corsOrigin: process.env.FRONTEND_URL
  },

  // Test environment settings
  test: {
    logLevel: 'silent',
    showStackTrace: false,
    detailedErrors: false,
    enableCors: false,
    corsOrigin: null
  },

  /**
   * Get current environment configuration
   */
  getCurrentConfig() {
    const env = process.env.NODE_ENV || 'development';
    return this[env] || this.development;
  },

  /**
   * Environment-specific error response formatter
   */
  formatErrorResponse(error, req) {
    const config = this.getCurrentConfig();
    const env = process.env.NODE_ENV || 'development';
    
    // Base error response
    const errorResponse = {
      success: false,
      error: config.detailedErrors ? error.message : 'An error occurred',
      timestamp: new Date().toISOString()
    };

    // Add environment-specific details
    if (config.detailedErrors) {
      errorResponse.details = {
        name: error.name,
        code: error.code || 'UNKNOWN_ERROR'
      };
    }

    // Add stack trace in development
    if (config.showStackTrace && error.stack) {
      errorResponse.stack = error.stack;
    }

    // Add request context in development
    if (env === 'development' && req) {
      errorResponse.request = {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body
      };
    }

    return errorResponse;
  },

  /**
   * Environment-specific logging
   */
  logError(error, context = {}) {
    const config = this.getCurrentConfig();
    const env = process.env.NODE_ENV || 'development';

    // Always log errors in production
    if (env === 'production') {
      logger.error('Production Error', {
        message: error.message,
        stack: error.stack,
        ...context
      });
    }
    // Log detailed errors in development
    else if (env === 'development') {
      logger.error('Development Error', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        ...context
      });
    }
    // Silent in test environment unless critical
    else if (env === 'test' && error.critical) {
      logger.error('Critical Test Error', {
        message: error.message,
        ...context
      });
    }
  },

  /**
   * Environment-specific database error handling
   */
  handleDatabaseError(error, operation = 'unknown') {
    const config = this.getCurrentConfig();
    const env = process.env.NODE_ENV || 'development';

    // Log database errors with operation context
    this.logError(error, {
      operation,
      type: 'database_error',
      database: env === 'production' ? 'PostgreSQL' : 'SQLite'
    });

    // Return appropriate error message
    if (config.detailedErrors) {
      return {
        message: `Database error during ${operation}: ${error.message}`,
        operation,
        database: env === 'production' ? 'PostgreSQL' : 'SQLite'
      };
    } else {
      return {
        message: 'Database operation failed',
        operation: 'database_query'
      };
    }
  },

  /**
   * Environment-specific validation error handling
   */
  handleValidationError(error, field = null) {
    const config = this.getCurrentConfig();

    this.logError(error, {
      type: 'validation_error',
      field
    });

    if (config.detailedErrors) {
      return {
        message: error.message,
        field,
        type: 'validation_error'
      };
    } else {
      return {
        message: 'Invalid input provided',
        type: 'validation_error'
      };
    }
  },

  /**
   * Environment-specific authentication error handling
   */
  handleAuthError(error, action = 'authentication') {
    const config = this.getCurrentConfig();

    this.logError(error, {
      type: 'auth_error',
      action
    });

    // Never expose detailed auth errors in production
    return {
      message: 'Authentication failed',
      type: 'auth_error'
    };
  },

  /**
   * Check if we're in development mode
   */
  isDevelopment() {
    return (process.env.NODE_ENV || 'development') === 'development';
  },

  /**
   * Check if we're in production mode
   */
  isProduction() {
    return process.env.NODE_ENV === 'production';
  },

  /**
   * Check if we're in test mode
   */
  isTest() {
    return process.env.NODE_ENV === 'test';
  }
};

module.exports = environmentHandler;