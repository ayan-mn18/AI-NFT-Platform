import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../config/supabase';
import logger from '../config/logger';
import { hashPassword } from '../utils/passwordService';
import { generateOtp, calculateOtpExpiration } from '../utils/otpService';
import { sendOtpEmail } from '../utils/emailService';
import { AppError, RegisterRequest, AuthErrorCode } from '../types';
import config from '../config/env';

/**
 * Auth Service
 * Handles all authentication business logic
 */

/**
 * Register a new user
 */
export const registerUser = async (
  request: RegisterRequest
): Promise<{ user_id: string; email: string; user_type: string; email_verified: boolean }> => {
  const supabase = getSupabaseClient();

  try {
    logger.info('Starting user registration', { email: request.email });

    const { email, password, user_type, full_name } = request;

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', email)
      .single();

    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email });
      throw new AppError(
        'Email already registered. Please use login or reset password.',
        409,
        AuthErrorCode.EMAIL_EXISTS,
        'email'
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate OTP
    const otp = generateOtp();
    const otpExpiresAt = calculateOtpExpiration();

    // Create user in database
    const userId = uuidv4();
    const now = new Date().toISOString();

    const { error: insertError } = await (supabase.from('users') as any).insert({
      user_id: userId,
      email,
      password_hash: passwordHash,
      email_verified: false,
      email_verification_otp: otp,
      email_otp_expires_at: otpExpiresAt.toISOString(),
      user_type,
      full_name: full_name || null,
      username: null,
      profile_picture_url: null,
      bio: null,
      is_active: true,
      failed_login_attempts: 0,
      account_locked_until: null,
      created_at: now,
      updated_at: now,
      last_login_at: null,
    });

    if (insertError) {
      logger.error('Failed to create user', { error: insertError, email });
      throw new AppError(
        'Failed to create user account',
        500,
        'DATABASE_ERROR'
      );
    }

    // Send OTP email
    try {
      if (config.enableEmailVerification) {
        await sendOtpEmail(email, otp, full_name);
      }
    } catch (emailError) {
      logger.error('Failed to send OTP email, rolling back user creation', {
        error: emailError,
        email,
      });

      await (supabase.from('users') as any).delete().eq('user_id', userId);

      throw new AppError(
        'Failed to send verification email. Please try again later.',
        500,
        AuthErrorCode.EMAIL_SEND_FAILED
      );
    }

    logger.info('User registered successfully', { user_id: userId, email });

    return {
      user_id: userId,
      email,
      user_type,
      email_verified: false,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Unexpected error during registration', { error });
    throw new AppError(
      'An unexpected error occurred during registration',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

export default {
  registerUser,
};
