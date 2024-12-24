const mongoose = require('mongoose');
const redisClient = require('../config/redis');
const logger = require('../config/logger');
const { listBackups } = require('./backup');

/**
 * Check MongoDB connection
 * @returns {Promise<Object>} Connection status
 */
async function checkMongoDB() {
  try {
    const status = {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.name,
      host: mongoose.connection.host
    };

    if (status.status === 'connected') {
      const start = process.hrtime();
      await mongoose.connection.db.admin().ping();
      const [seconds, nanoseconds] = process.hrtime(start);
      status.responseTime = seconds * 1000 + nanoseconds / 1000000;
    }

    return status;
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Check Redis connection
 * @returns {Promise<Object>} Connection status
 */
async function checkRedis() {
  try {
    const status = {
      status: redisClient.isReady ? 'connected' : 'disconnected',
      retryCount: redisClient.retryCount
    };

    if (status.status === 'connected') {
      const start = process.hrtime();
      await redisClient.ping();
      const [seconds, nanoseconds] = process.hrtime(start);
      status.responseTime = seconds * 1000 + nanoseconds / 1000000;
    }

    return status;
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Check backup system
 * @returns {Object} Backup system status
 */
function checkBackups() {
  try {
    const backups = listBackups();
    return {
      status: 'operational',
      backupCount: backups.length,
      lastBackup: backups[0]?.created || null
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Run all health checks
 */
async function runHealthCheck() {
  logger.info('Starting health check');

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      mongodb: await checkMongoDB(),
      redis: await checkRedis(),
      backups: checkBackups()
    }
  };

  // Check if any service is down
  if (Object.values(health.services).some(service => service.status === 'error' || service.status === 'disconnected')) {
    health.status = 'degraded';
  }

  logger.info('Health check completed', { health });
  return health;
}

// Run health check if script is called directly
if (require.main === module) {
  runHealthCheck()
    .then(health => {
      console.log(JSON.stringify(health, null, 2));
      process.exit(health.status === 'healthy' ? 0 : 1);
    })
    .catch(error => {
      logger.error('Health check failed', { error: error.message });
      process.exit(1);
    });
}

module.exports = {
  runHealthCheck,
  checkMongoDB,
  checkRedis,
  checkBackups
}; 