const jwt = require("jsonwebtoken");
const { pathToRegexp } = require("path-to-regexp");
const { AppError } = require("./error-handler");
const { logger } = require("../config/logger");
const redisClient = require("../config/redis");

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60; // 15 minutes in seconds

const UNPROTECTED_ROUTES = [
  "/api/collection-feedback/createReviewForWidget",
  "/api/collection-feedback/create-review-for-widget",
  "/api/nps/calculatenps",
  "/api/users/register",
  "/api/users/login",
  "/api/users/request-password-reset",
  "/api/users/reset-password",
  "/api/widgets",
  "/api/users/:id/products/:pid/widgets/:wid/serve",
  "/api/payments/webhook",
  "/static/(.*)",
  "/scripts/(.*)",
  "/styles/(.*)",
  "/",
  "/api-docs/(.*)", // Allow Swagger docs
  "/api/v1/health", // Allow basic health check
  "/api/v1/health/detailed", // Allow detailed health check
];

const isUnprotectedRoute = (path) => {
  for (let route of UNPROTECTED_ROUTES) {
    const regex = pathToRegexp(route);
    if (regex.test(path)) {
      return true;
    }
  }
  return false;
};

const checkBlockedIP = async (ip) => {
  const key = `blocked:${ip}`;
  const failedAttempts = await redisClient.get(key);
  
  if (failedAttempts && parseInt(failedAttempts) >= MAX_FAILED_ATTEMPTS) {
    throw new AppError(429, "Too many failed attempts. Please try again later.");
  }
};

const incrementFailedAttempts = async (ip) => {
  const key = `blocked:${ip}`;
  const attempts = await redisClient.get(key) || 0;
  const newAttempts = parseInt(attempts) + 1;
  
  await redisClient.set(key, newAttempts, BLOCK_DURATION);
  
  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    logger.warn(`IP ${ip} blocked due to too many failed attempts`);
  }
  
  return newAttempts;
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
      algorithms: ['HS256'], // Explicitly specify allowed algorithms
      maxAge: '24h' // Maximum age of token
    });
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (decodedToken.exp && decodedToken.exp < now) {
      throw new AppError(401, "Token has expired");
    }

    // Check if token has been blacklisted (e.g., after logout)
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AppError(401, "Token has been invalidated");
    }

    req.userData = { 
      userId: decodedToken.userId,
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
