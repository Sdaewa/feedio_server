const jwt = require("jsonwebtoken");
const { AppError } = require("./error-handler");
const { logger } = require("../config/logger");
const Redis = require('ioredis');

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60; // 15 minutes in seconds

let redisClient;
try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });
} catch (error) {
  logger.warn('Redis connection failed, proceeding without rate limiting');
}

// Simple exact match routes
const UNPROTECTED_ROUTES = [
  "/api/collection-feedback/createReviewForWidget",
  "/api/collection-feedback/create-review-for-widget",
  "/api/nps/calculatenps",
  "/api/users/register",
  "/api/users/login",
  "/api/users/request-password-reset",
  "/api/users/reset-password",
  "/api/widgets",
  "/api/payments/webhook",
  "/api/v1/health",
  "/api/v1/health/detailed",
  "/"
];

const isUnprotectedRoute = (path) => {
  // Check exact matches
  if (UNPROTECTED_ROUTES.includes(path)) {
    return true;
  }

  // Check static file paths
  if (path.startsWith('/static/') || 
      path.startsWith('/scripts/') || 
      path.startsWith('/styles/') || 
      path.startsWith('/api-docs/')) {
    return true;
  }

  // Check widget serve path
  const widgetServePattern = /^\/api\/users\/[^/]+\/products\/[^/]+\/widgets\/[^/]+\/serve$/;
  if (widgetServePattern.test(path)) {
    return true;
  }

  return false;
};

const checkBlockedIP = async (ip) => {
  if (!redisClient) return;
  
  const key = `blocked:${ip}`;
  try {
    const failedAttempts = await redisClient.get(key);
    if (failedAttempts && parseInt(failedAttempts) >= MAX_FAILED_ATTEMPTS) {
      throw new AppError(429, "Too many failed attempts. Please try again later.");
    }
  } catch (error) {
    logger.warn('Redis operation failed in checkBlockedIP', error);
  }
};

const incrementFailedAttempts = async (ip) => {
  if (!redisClient) return;

  const key = `blocked:${ip}`;
  try {
    const attempts = await redisClient.get(key) || 0;
    const newAttempts = parseInt(attempts) + 1;
    
    await redisClient.set(key, newAttempts, 'EX', BLOCK_DURATION);
    
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      logger.warn(`IP ${ip} blocked due to too many failed attempts`);
    }
    
    return newAttempts;
  } catch (error) {
    logger.warn('Redis operation failed in incrementFailedAttempts', error);
    return 0;
  }
};

module.exports = async (req, res, next) => {
  if (isUnprotectedRoute(req.path) || req.method === "OPTIONS") {
    return next();
  }

  try {
    // Check if IP is blocked
    await checkBlockedIP(req.ip);

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new AppError(401, "Authentication required");
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      maxAge: '24h'
    });
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (decodedToken.exp && decodedToken.exp < now) {
      throw new AppError(401, "Token has expired");
    }

    // Check if token has been blacklisted
    if (redisClient) {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new AppError(401, "Token has been invalidated");
      }
    }

    req.userData = { 
      userId: decodedToken.userId,
      email: decodedToken.email,
      tokenExp: decodedToken.exp
    };
    next();
  } catch (error) {
    // Increment failed attempts for authentication errors
    if (error instanceof AppError && error.statusCode === 401) {
      await incrementFailedAttempts(req.ip);
    }

    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error("Authentication error", { 
        error: error.message, 
        path: req.path,
        ip: req.ip
      });
      next(new AppError(401, "Invalid authentication credentials"));
    }
  }
};
