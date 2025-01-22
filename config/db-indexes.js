const mongoose = require('mongoose');
const { logger } = require('./logger');

async function setupIndexes() {
  try {
    // User indexes
    await mongoose.model('User').collection.createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { stripeCustomerId: 1 }, sparse: true },
      { key: { stripeSubscriptionId: 1 }, sparse: true },
      { key: { membershipStatus: 1 } },
      { key: { 'products': 1 } }
    ]);

    // Product indexes
    await mongoose.model('Product').collection.createIndexes([
      { key: { userId: 1 } },
      { key: { name: 1 } },
      { key: { createdAt: -1 } }
    ]);

    // Review indexes
    await mongoose.model('Review').collection.createIndexes([
      { key: { productId: 1 } },
      { key: { userId: 1 } },
      { key: { rating: 1 } },
      { key: { createdAt: -1 } },
      { key: { status: 1 } }
    ]);

    // Payment indexes
    await mongoose.model('Payment').collection.createIndexes([
      { key: { userId: 1 } },
      { key: { status: 1 } },
      { key: { createdAt: -1 } }
    ]);

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating database indexes', error);
    throw error;
  }
}

module.exports = { setupIndexes }; 