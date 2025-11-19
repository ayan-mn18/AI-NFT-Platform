import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError, ErrorResponse } from '../types';

/**
 * Error Handler Middleware
 * Catches all errors and returns consistent error responses
 * Should be the last middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error. Please try again later.';
  let code = 'INTERNAL_SERVER_ERROR';
  let field: string | undefined;
  let details: Record<string, any> | undefined;

  // Handle custom AppError
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    field = error.field;
    details = error.details;
  }
  // Handle validation errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }
  // Handle other errors
  else {
    statusCode = error instanceof Error && 'statusCode' in error ? error.statusCode as number : 500;
    message = error.message || 'Internal server error';
  }

  const response: ErrorResponse = {
    status: 'error',
    message,
    code,
    ...(field && { field }),
    ...(details && { details }),
  };

  res.status(statusCode).json(response);
};

export default errorHandler;
