const { URL } = require('url');

const validateEnv = () => {
  const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_EXPIRY',
    'FRONTEND_URL',
    'CLIENT_URL',
    'EMAIL_USERNAME',
    'EMAIL_PASSWORD',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_TTL'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  // Validate specific formats
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (!process.env.MONGODB_URI.startsWith('mongodb')) {
    throw new Error('Invalid MONGODB_URI format');
  }

  const port = parseInt(process.env.PORT);
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error('Invalid PORT number');
  }

  try {
    new URL(process.env.FRONTEND_URL);
    new URL(process.env.CLIENT_URL);
  } catch (error) {
    throw new Error('Invalid FRONTEND_URL or CLIENT_URL format');
  }

  const redisTTL = parseInt(process.env.REDIS_TTL);
  if (isNaN(redisTTL) || redisTTL <= 0) {
    throw new Error('Invalid REDIS_TTL value');
  }
};

module.exports = validateEnv; 