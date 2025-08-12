const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration for different environments
const config = {
  development: {
    // Use SQLite for local development (no PostgreSQL required)
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    dialect: 'postgres',
    host: process.env.DATABASE_URL ? null : process.env.DB_HOST,
    port: process.env.DATABASE_URL ? null : process.env.DB_PORT || 5432,
    database: process.env.DATABASE_URL ? null : process.env.DB_NAME,
    username: process.env.DATABASE_URL ? null : process.env.DB_USER,
    password: process.env.DATABASE_URL ? null : process.env.DB_PASSWORD,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
let sequelize;

if (process.env.DATABASE_URL && env === 'production') {
  // Heroku provides DATABASE_URL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    pool: dbConfig.pool
  });
} else if (env === 'production') {
  // Custom PostgreSQL configuration for production
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      dialectOptions: dbConfig.dialectOptions,
      logging: dbConfig.logging,
      pool: dbConfig.pool
    }
  );
} else {
  // Development with SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbConfig.storage,
    logging: dbConfig.logging,
    pool: dbConfig.pool
  });
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ Database connection established successfully (${env} mode with ${sequelize.getDialect()}).`);
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection,
  Sequelize
};