import bcryptjs from 'bcryptjs';
import config from '../config/env';
import logger from '../config/logger';

/**
 * Password Hashing Utility
 * Handles password hashing and comparison using bcryptjs with 12 salt rounds
 */

/**
 * Hash a password
 * Uses bcrypt with configured salt rounds (default 12)
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await bcryptjs.hash(password, config.bcryptRounds);
  } catch (error) {
    logger.error('Failed to hash password', { error });
    throw error;
  }
};

/**
 * Compare a plain password with a hashed password
 * Returns true if they match, false otherwise
 */
export const comparePassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await bcryptjs.compare(plainPassword, hashedPassword);
  } catch (error) {
    logger.error('Failed to compare passwords', { error });
    throw error;
  }
};

/**
 * Validate password strength
 * Must contain: uppercase, lowercase, number, special character, min 8 chars
 */
export const isValidPassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Get password validation error message
 */
export const getPasswordValidationError = (password: string): string | null => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[@$!%*?&]/.test(password)) {
    return 'Password must contain at least one special character (@$!%*?&)';
  }
  return null;
};

export default {
  hashPassword,
  comparePassword,
  isValidPassword,
  getPasswordValidationError,
};
