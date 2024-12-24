const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const logger = require('../config/logger');

const execAsync = util.promisify(exec);

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const BACKUP_RETENTION_DAYS = 7;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/feedio';

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logger.info('Created backup directory', { path: BACKUP_DIR });
  }
}

/**
 * Generate backup filename with timestamp
 * @returns {string} Backup filename
 */
function generateBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `backup-${timestamp}.gz`;
}

/**
 * Create MongoDB backup using mongodump
 * @returns {Promise<string>} Path to the created backup file
 */
async function createBackup() {
  const backupFile = path.join(BACKUP_DIR, generateBackupFilename());
  const command = `mongodump --uri="${MONGODB_URI}" --gzip --archive="${backupFile}"`;

  try {
    logger.info('Starting database backup');
    await execAsync(command);
    logger.info('Backup completed successfully', { file: backupFile });
    return backupFile;
  } catch (error) {
    logger.error('Backup failed', { error: error.message });
    throw error;
  }
}

/**
 * Clean up old backups
 */
function cleanOldBackups() {
  logger.info('Cleaning old backups');
  const files = fs.readdirSync(BACKUP_DIR);
  const now = new Date();

  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const daysOld = (now - stats.mtime) / (1000 * 60 * 60 * 24);

    if (daysOld > BACKUP_RETENTION_DAYS) {
      fs.unlinkSync(filePath);
      logger.info('Deleted old backup', { file: filePath });
    }
  });
}

/**
 * Restore from backup file
 * @param {string} backupFile Path to backup file
 */
async function restoreBackup(backupFile) {
  if (!fs.existsSync(backupFile)) {
    throw new Error('Backup file does not exist');
  }

  const command = `mongorestore --uri="${MONGODB_URI}" --gzip --archive="${backupFile}"`;

  try {
    logger.info('Starting database restore', { file: backupFile });
    await execAsync(command);
    logger.info('Restore completed successfully');
  } catch (error) {
    logger.error('Restore failed', { error: error.message });
    throw error;
  }
}

/**
 * List available backups
 * @returns {Array<Object>} List of backup files with metadata
 */
function listBackups() {
  const files = fs.readdirSync(BACKUP_DIR);
  return files.map(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    return {
      filename: file,
      path: filePath,
      size: stats.size,
      created: stats.mtime
    };
  });
}

/**
 * Run backup process
 */
async function runBackup() {
  try {
    ensureBackupDir();
    await createBackup();
    cleanOldBackups();
  } catch (error) {
    logger.error('Backup process failed', { error: error.message });
    process.exit(1);
  }
}

// Export functions for use in other scripts
module.exports = {
  runBackup,
  restoreBackup,
  listBackups
};

// Run backup if script is called directly
if (require.main === module) {
  runBackup();
} 