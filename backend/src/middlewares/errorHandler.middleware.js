export const errorHandler = (err, req, res, next) => {
  // Log the error to the console for our debugging
  console.error(`[Error]: ${err.message}`);

  // Determine the status code (default to 500 Internal Server Error)
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong on the server.';

  // Send a standardized JSON error response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Only send the detailed stack trace if we are in development mode!
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

// 404 Not Found Middleware
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Route ${req.originalUrl} not found.`,
  });
};
