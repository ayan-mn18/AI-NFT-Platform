import crypto from 'crypto';
import config from '../config/env';

/**
 * OTP (One-Time Password) Utility
 * Generates and validates 6-digit OTPs for email verification
 */

/**
 * Generate a random 6-digit OTP
 */
export const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Calculate OTP expiration time
 * Returns a Date object set to current time + OTP_EXPIRATION_MINUTES
 */
export const calculateOtpExpiration = (): Date => {
  const expirationTime = new Date();
  expirationTime.setMinutes(expirationTime.getMinutes() + config.otpExpirationMinutes);
  return expirationTime;
};

/**
 * Check if OTP has expired
 */
export const isOtpExpired = (expirationTime: Date): boolean => {
  return new Date() > expirationTime;
};

/**
 * Validate OTP format (must be 6 digits)
 */
export const isValidOtpFormat = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};

export default {
  generateOtp,
  calculateOtpExpiration,
  isOtpExpired,
  isValidOtpFormat,
};
