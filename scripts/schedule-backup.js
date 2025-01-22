const cron = require('node-cron');
const { runBackup } = require('./backup');
const { logger } = require('../config/logger');

// Schedule backup to run at 2 AM every day
cron.schedule('0 2 * * *', async () => {
  logger.info('Starting scheduled backup');
  try {
    await runBackup();
    logger.info('Scheduled backup completed successfully');
  } catch (error) {
    logger.error('Scheduled backup failed', { error: error.message });
  }
}, {
  scheduled: true,
  timezone: 'UTC'
});

logger.info('Backup scheduler started');

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('Backup scheduler stopping');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Backup scheduler stopping');
  process.exit(0);
}); 