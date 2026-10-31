const jwt = require("jsonwebtoken");
const { AppError } = require("./error-handler");
const { logger } = require("../config/logger");

// Fail closed: every request that reaches this middleware needs a valid token.
// Public routes must simply not use it (apply it per route, or after the
// public routes in a router). There is deliberately no path allow-list:
// inside a router req.path is relative ("/login", not "/api/users/login"), so
// the old list never matched, and its "/" entry switched authentication off.

module.exports = async (req, res, next) => {
  // CORS preflight requests carry no token by design.
  if (req.method === "OPTIONS") {
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
