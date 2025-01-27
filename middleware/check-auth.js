const jwt = require("jsonwebtoken");
const { AppError } = require("./error-handler");
const { logger } = require("../config/logger");

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

module.exports = async (req, res, next) => {
  if (isUnprotectedRoute(req.path) || req.method === "OPTIONS") {
    return next();
  }

  try {
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

    req.userData = { 
      userId: decodedToken.userId,
      email: decodedToken.email,
      tokenExp: decodedToken.exp
    };
    next();
  } catch (error) {
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
