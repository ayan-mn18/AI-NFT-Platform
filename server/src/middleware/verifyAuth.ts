import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import logger from '../config/logger';
import { AuthenticatedRequest, JWTPayload, AppError, AuthErrorCode } from '../types';

/**
 * Verify Auth Middleware
 * Validates JWT token from cookies and checks email verification status
 * Attaches user payload to request object
 */
export const verifyAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from cookies
    const token = req.cookies?.auth_token;

    if (!token) {
      logger.warn('No auth token provided', { path: req.path });
      throw new AppError(
        'Unauthorized. Please sign in.',
        401,
        AuthErrorCode.UNAUTHORIZED
      );
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

    // Check if email is verified (optional but recommended)
    if (!decoded.email_verified) {
      logger.warn('User attempted access with unverified email', {
        email: decoded.email,
      });
      throw new AppError(
        'Email not verified. Please verify your email first.',
        403,
        AuthErrorCode.EMAIL_NOT_VERIFIED
      );
    }

    // Attach user payload to request
    req.user = decoded;

    logger.debug('Auth verification successful', { user_id: decoded.user_id });
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired', { path: req.path });
      return res.status(401).json({
        status: 'error',
        message: 'Token expired. Please sign in again.',
        code: AuthErrorCode.TOKEN_EXPIRED,
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token', { path: req.path, error: error.message });
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token.',
        code: AuthErrorCode.INVALID_TOKEN,
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
      });
    }

    logger.error('Auth verification error', { error, path: req.path });
    res.status(401).json({
      status: 'error',
      message: 'Authentication failed.',
      code: AuthErrorCode.UNAUTHORIZED,
    });
  }
};

export default verifyAuth;
