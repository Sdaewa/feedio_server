const compression = require('compression');

const shouldCompress = (req, res) => {
  // Don't compress responses with this request header
  if (req.headers['x-no-compression']) {
    return false;
  }

  // Skip compressing responses that are already compressed
  if (res.getHeader('Content-Type')?.includes('image/')) {
    return false;
  }

  // Use compression filter function
  return compression.filter(req, res);
};

const compressionMiddleware = compression({
  // Filter function to determine which responses to compress
  filter: shouldCompress,
  // Only compress responses larger than 1KB
  threshold: 1024,
  // Compression level (0-9), higher = better compression but slower
  level: 6,
  // Enable memory caching for compressed responses
  memLevel: 8,
  // Minimum size reduction to store compressed version
  minRatio: 0.8
});

module.exports = compressionMiddleware; 