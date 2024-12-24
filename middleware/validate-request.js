const { validationResult } = require('express-validator');
const { AppError } = require('./error-handler');

const validateRequest = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));

    throw new AppError(422, 'Invalid input', { errors: extractedErrors });
  };
};

// Common validation schemas
const commonValidations = {
  id: {
    in: ['params'],
    isMongoId: true,
    errorMessage: 'Invalid ID format'
  },
  email: {
    in: ['body'],
    isEmail: true,
    normalizeEmail: true,
    errorMessage: 'Invalid email format'
  },
  password: {
    in: ['body'],
    isLength: {
      options: { min: 8 },
      errorMessage: 'Password must be at least 8 characters long'
    },
    matches: {
      options: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/,
      errorMessage: 'Password must contain at least one number, one lowercase and one uppercase letter'
    }
  },
  name: {
    in: ['body'],
    isLength: {
      options: { min: 2, max: 50 },
      errorMessage: 'Name must be between 2 and 50 characters'
    },
    trim: true
  }
};

module.exports = {
  validateRequest,
  commonValidations
}; 