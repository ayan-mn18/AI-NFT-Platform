import rateLimit from 'express-rate-limit';
import config from '../config/env';
import logger from '../config/logger';

/**
 * Rate Limiting Middleware
 * Limits requests based on IP address to prevent abuse
 */

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // 15 minutes
  max: config.rateLimitMaxRequests, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      status: 'error',
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retry_after: 900, // 15 minutes in seconds
    });
  },
});

// Auth endpoints limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many login attempts, please try again later.',
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      status: 'error',
      message: 'Too many login attempts. Try again in 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
      retry_after: 900,
    });
  },
});

// Register endpoint limiter
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per hour
  skipSuccessfulRequests: false,
  message: 'Too many registration attempts, please try again later.',
  handler: (req, res) => {
    logger.warn('Registration rate limit exceeded', {
      ip: req.ip,
    });

    res.status(429).json({
      status: 'error',
      message: 'Too many registration attempts. Try again in 1 hour.',
      code: 'RATE_LIMIT_EXCEEDED',
      retry_after: 3600,
    });
  },
});

// OTP resend limiter
export const otpResendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Limit each IP to 3 resends per 5 minutes
  skipSuccessfulRequests: false,
  message: 'Too many OTP resend attempts, please try again later.',
  handler: (req, res) => {
    logger.warn('OTP resend rate limit exceeded', {
      ip: req.ip,
    });

    res.status(429).json({
      status: 'error',
      message: 'Too many OTP resend attempts. Try again in 5 minutes.',
      code: 'RESEND_LIMIT_EXCEEDED',
      retry_after: 300,
    });
  },
});

export default {
  globalLimiter,
  authLimiter,
  registerLimiter,
  otpResendLimiter,
};
