const { logger } = require('../config/logger');
const { performance } = require('perf_hooks');

const requestTracer = (req, res, next) => {
  // Add timestamp and request ID
  req.startTime = performance.now();
  req.requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Capture original URL and method
  const originalUrl = req.originalUrl || req.url;
  const method = req.method;

  // Create a trace object
  const trace = {
    requestId: req.requestId,
    method,
    path: originalUrl,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  };

  // Log request start
  logger.info('Request started', { trace });

  // Capture response data
  const originalSend = res.send;
  res.send = function (body) {
    res.responseBody = body;
    return originalSend.call(this, body);
  };

  // Log response when request completes
  res.on('finish', () => {
    const duration = performance.now() - req.startTime;
    
    trace.statusCode = res.statusCode;
    trace.duration = `${duration.toFixed(2)}ms`;
    trace.contentLength = res.get('content-length');
    
    // Don't log response body for file downloads or streams
    const contentType = res.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      trace.responseType = contentType;
    } else if (res.responseBody) {
      try {
        const parsedBody = JSON.parse(res.responseBody);
        // Only log non-sensitive response data
        trace.response = {
          status: parsedBody.status,
          message: parsedBody.message
        };
      } catch (e) {
        // If parsing fails, don't include response body
      }
    }

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Request failed', { trace });
    } else if (res.statusCode >= 400) {
      logger.warn('Request failed', { trace });
    } else {
      logger.info('Request completed', { trace });
    }
  });

  // Handle errors
  res.on('error', (error) => {
    trace.error = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    logger.error('Request error', { trace });
  });

  next();
};

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = performance.now();

  res.on('finish', () => {
    const duration = performance.now() - start;
    if (duration > 1000) { // Log slow requests (over 1 second)
      logger.warn('Slow request detected', {
        path: req.originalUrl,
        method: req.method,
        duration: `${duration.toFixed(2)}ms`,
        requestId: req.requestId
      });
    }
  });

  next();
};

module.exports = {
  requestTracer,
  performanceMonitor
}; 