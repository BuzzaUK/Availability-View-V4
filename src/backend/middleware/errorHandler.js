const logger = require('../utils/logger');
const environmentHandler = require('./environmentHandler');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error using environment-specific handler
  environmentHandler.logError(err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(error => error.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate entry found';
    error = {
      message,
      statusCode: 400
    };
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Referenced record not found';
    error = {
      message,
      statusCode: 400
    };
  }

  // Sequelize database connection error
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    const message = 'Database connection failed';
    error = {
      message,
      statusCode: 503
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      message,
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      message,
      statusCode: 401
    };
  }

  // Cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = {
      message,
      statusCode: 400
    };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  
  // Use environment-specific error formatting
  const response = environmentHandler.formatErrorResponse(err, req);

  res.status(statusCode).json(response);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection', {
    message: err.message,
    stack: err.stack
  });
  
  // Close server & exit process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', {
    message: err.message,
    stack: err.stack
  });
  
  // Close server & exit process
  process.exit(1);
});

module.exports = errorHandler;