require('dotenv').config();
const validateEnv = require('./config/env-validation');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { logger } = require('./config/logger');
const { versionCheck } = require('./middleware/api-version');
const { serve: swaggerServe, setup: swaggerSetup } = require('./config/swagger');
const { setupIndexes } = require('./config/db-indexes');
const compressionMiddleware = require('./middleware/compression');
const securityMiddleware = require('./middleware/security');
require('./scripts/schedule-backup');

const usersRoute = require('./routes/users-route');
const productsRoute = require('./routes/products-route');
const reviewsRoute = require('./routes/reviews-route');
const paymentsRoute = require('./routes/payments-route');
const widgetRoute = require('./routes/widget-route');

const app = express();

try {
  validateEnv();
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}


const rateLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100
});


securityMiddleware(app);


app.use(compressionMiddleware);
app.use(express.json());

// Serve static files with proper MIME types
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://feedio.app', 'https://www.feedio.app', 'https://feedio-staging.onrender.com', 'https://feedio-server.onrender.com']
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(rateLimiter);
app.use(versionCheck);

// Routes
app.use('/api/users', usersRoute);
app.use('/api/products', productsRoute);
app.use('/api/reviews', reviewsRoute);
app.use('/api/payments', paymentsRoute);
app.use('/api/widgets', widgetRoute);

// Swagger documentation
app.use('/api-docs', swaggerServe, swaggerSetup);

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    tls: true,
    authSource: 'admin',
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    logger.info("Connected to MongoDB");
    // Set up database indexes
    await setupIndexes();
    logger.info("Database indexes configured");
  })
  .catch((err) => {
    logger.error("Could not connect to MongoDB", err);
    process.exit(1);
  });

const server = app.listen(process.env.PORT, () =>
  logger.info(`Server running on port ${process.env.PORT}`)
);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});
