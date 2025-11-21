import jwt from 'jsonwebtoken';
import config from '../config/env';
import logger from '../config/logger';
import { JWTPayload, AuthErrorCode, AppError } from '../types';

/**
 * JWT Service
 * Handles JWT token generation, verification, and validation
 */

/**
 * Generate JWT token
 * Returns a signed JWT token with user information
 */
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  try {
    const signedToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration,
      algorithm: 'HS256',
    } as any);

    logger.info('JWT token generated', { email: payload.email, user_id: payload.user_id });
    return signedToken;
  } catch (error) {
    logger.error('Failed to generate JWT token', { error });
    throw new AppError(
      'Failed to generate authentication token',
      500,
      'TOKEN_GENERATION_ERROR'
    );
  }
};

/**
 * Verify JWT token
 * Returns decoded token if valid, throws error if invalid/expired
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
    } as any) as unknown as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('JWT token expired', { error: error.message });
      throw new AppError(
        'Your session has expired. Please sign in again.',
        401,
        AuthErrorCode.TOKEN_EXPIRED
      );
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { error: error.message });
      throw new AppError(
        'Invalid authentication token. Please sign in again.',
        401,
        AuthErrorCode.INVALID_TOKEN
      );
    }

    logger.error('Unexpected error verifying token', { error });
    throw new AppError(
      'Failed to verify authentication token',
      500,
      'TOKEN_VERIFICATION_ERROR'
    );
  }
};

/**
 * Decode JWT token without verification
 * Useful for logging/debugging, use verifyToken for security
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    logger.error('Failed to decode token', { error });
    return null;
  }
};

/**
 * Get token expiration time from config
 * Returns expiration time in milliseconds
 */
export const getTokenExpirationMs = (): number => {
  // Parse JWT expiration string (e.g., "7d" -> milliseconds)
  const expiration = config.jwtExpiration;
  const match = expiration.match(/^(\d+)([smhd])$/);

  if (!match) {
    // Default to 7 days if parsing fails
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
};

export default {
  generateToken,
  verifyToken,
  decodeToken,
  getTokenExpirationMs,
};
