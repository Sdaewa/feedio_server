const mongoose = require('mongoose');
const os = require('os');
const { logger } = require('../config/logger');

/**
 * Basic health check
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.basicCheck = (req, res) => {
  logger.info('Basic health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
};

/**
 * Detailed health check
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.detailedCheck = async (req, res) => {
  logger.info('Detailed health check requested');
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    systemInfo: {
      platform: process.platform,
      nodeVersion: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        processUsage: process.memoryUsage()
      },
      cpu: {
        cores: os.cpus().length,
        loadAvg: os.loadavg()
      }
    },
    services: {
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        name: mongoose.connection.name,
        host: mongoose.connection.host
      }
    }
  };

  // Check if database is down
  if (mongoose.connection.readyState !== 1) {
    health.status = 'degraded';
  }

  // Add response time
  health.responseTime = {
    database: await checkDatabaseResponseTime()
  };

  logger.info('Health check completed', { health });
  res.json(health);
};

/**
 * Check database response time
 * @returns {Promise<number>} Response time in milliseconds
 */
async function checkDatabaseResponseTime() {
  const start = process.hrtime();
  try {
    await mongoose.connection.db.admin().ping();
    const [seconds, nanoseconds] = process.hrtime(start);
    return seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
  } catch (error) {
    logger.error('Database ping failed', { error });
    return -1;
  }
} 