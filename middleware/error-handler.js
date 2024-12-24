class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(400, message);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(400, message);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(400, message, errors);
};

const handleJWTError = () =>
  new AppError(401, 'Invalid token. Please log in again!');

const handleJWTExpiredError = () =>
  new AppError(401, 'Your token has expired! Please log in again.');

const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError(400, 'File too large! Maximum size is 5MB');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(400, 'Unexpected field name in form data');
  }
  return new AppError(400, 'Error uploading file');
};

const handleStripeError = (err) => {
  if (err.type === 'StripeCardError') {
    return new AppError(400, err.message);
  }
  if (err.type === 'StripeInvalidRequestError') {
    return new AppError(400, 'Invalid payment information');
  }
  return new AppError(500, 'Error processing payment');
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    details: err.details
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response = {
      status: err.status,
      message: err.message
    };
    
    // Only include details if they exist
    if (err.details) {
      response.details = err.details;
    }
    
    res.status(err.statusCode).json(response);
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }
};

const errorHandler = (err, req, res) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MulterError') error = handleMulterError(error);
    if (error.type && error.type.startsWith('Stripe')) error = handleStripeError(error);

    sendErrorProd(error, res);
  }
};

module.exports = {
  errorHandler,
  AppError
}; 