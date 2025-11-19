import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../config/logger';
import { AppError, ValidationError } from '../types';

/**
 * Request Validator Middleware Factory
 * Validates request body, params, and query against a Joi schema
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Combine body, params, and query for validation
      const dataToValidate = {
        body: req.body,
        params: req.params,
        query: req.query,
      };

      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors: ValidationError[] = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/"/g, ''),
        }));

        logger.warn('Validation failed', {
          path: req.path,
          errors,
        });

        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors,
        });
      }

      // Replace request data with validated data
      req.body = value.body;
      req.params = value.params;
      req.query = value.query;

      next();
    } catch (error) {
      logger.error('Validation middleware error', { error });
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };
};

/**
 * Email validation schema
 */
export const emailSchema = Joi.string()
  .email()
  .required()
  .messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  });

/**
 * Password validation schema
 */
export const passwordSchema = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.pattern.base':
      'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)',
    'any.required': 'Password is required',
  });

/**
 * OTP validation schema (6 digits)
 */
export const otpSchema = Joi.string()
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    'string.pattern.base': 'OTP must be 6 digits',
    'any.required': 'OTP is required',
  });

/**
 * Username validation schema
 */
export const usernameSchema = Joi.string()
  .alphanum()
  .min(3)
  .max(30)
  .messages({
    'string.alphanum': 'Username must contain only alphanumeric characters',
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username must not exceed 30 characters',
  });

export default validateRequest;
