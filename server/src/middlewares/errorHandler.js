export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR');
  const message = err.message || 'Internal Server Error';

  const errorPayload = {
    code,
    message,
  };

  if (err.issues && Array.isArray(err.issues)) {
    errorPayload.issues = err.issues;
  }

  if (err.details) {
    errorPayload.details = err.details;
  }

  // Avoid exposing raw internal error details in 500 responses
  if (statusCode === 500 && !err.isOperational) {
    console.error('Unhandled internal server error:', err);
    errorPayload.message = 'Internal Server Error';
    errorPayload.code = 'INTERNAL_ERROR';
  }

  res.status(statusCode).json({
    success: false,
    error: errorPayload,
  });
};

