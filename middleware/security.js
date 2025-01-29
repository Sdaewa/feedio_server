const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
const { logger } = require('../config/logger');

const securityMiddleware = (app) => {
  // Set security HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", "http://localhost:8080"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'", "*"],
          frameAncestors: ["'self'", "*"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: true,
      frameguard: false,
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: false,
      referrerPolicy: { policy: 'no-referrer-when-downgrade' },
      xssFilter: true,
    })
  );

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn(`Request sanitized for NoSQL injection`, { key, path: req.originalUrl });
    }
  }));

  // Data sanitization against XSS
  app.use((req, res, next) => {
    if (req.body) {
      for (let key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = xss(req.body[key]);
        }
      }
    }
    next();
  });

  // Prevent parameter pollution
  app.use(hpp({
    whitelist: [
      'name',
      'email',
      'membershipStatus',
      'sortBy',
      'limit',
      'page'
    ]
  }));

  // Limit request size
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
};

module.exports = securityMiddleware; 