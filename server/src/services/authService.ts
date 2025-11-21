import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../config/supabase';
import logger from '../config/logger';
import { hashPassword, comparePassword } from '../utils/passwordService';
import { generateOtp, calculateOtpExpiration, isOtpExpired, isValidOtpFormat } from '../utils/otpService';
import { sendOtpEmail, sendWelcomeEmail } from '../utils/emailService';
import { generateToken, getTokenExpirationMs } from '../utils/jwtService';
import { AppError, RegisterRequest, VerifyEmailRequest, ResendOtpRequest, SignInRequest, AuthErrorCode } from '../types';
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

      // await (supabase.from('users') as any).delete().eq('user_id', userId);

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

/**
 * Verify email with OTP
 */
export const verifyEmailUser = async (
  request: VerifyEmailRequest
): Promise<{ user_id: string; email: string; email_verified: boolean; token: string; expiresIn: number }> => {
  const supabase = getSupabaseClient();

  try {
    const { email, otp } = request;

    logger.info('Starting email verification', { email });

    // Validate OTP format
    if (!isValidOtpFormat(otp)) {
      throw new AppError(
        'Invalid OTP format. OTP must be 6 digits.',
        400,
        AuthErrorCode.INVALID_OTP,
        'otp'
      );
    }

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('user_id, email_verification_otp, email_otp_expires_at, email_verified, user_type, full_name')
      .eq('email', email)
      .single();

    if (!user || findError) {
      logger.warn('Email verification attempt for non-existent user', { email });
      throw new AppError(
        'Email not found. Please register first.',
        404,
        AuthErrorCode.EMAIL_NOT_FOUND,
        'email'
      );
    }

    const userData = user as any;

    // Check if email already verified
    if (userData.email_verified) {
      logger.warn('Email verification attempt for already verified email', { email });
      throw new AppError(
        'Email is already verified. Please sign in to continue.',
        400,
        AuthErrorCode.EMAIL_NOT_VERIFIED,
        'email'
      );
    }

    // Check if OTP has expired
    if (!userData.email_otp_expires_at || isOtpExpired(new Date(userData.email_otp_expires_at))) {
      logger.warn('OTP verification attempt with expired OTP', { email });
      throw new AppError(
        'OTP has expired. Please request a new one.',
        400,
        AuthErrorCode.OTP_EXPIRED,
        'otp'
      );
    }

    // Verify OTP matches
    if (userData.email_verification_otp !== otp) {
      logger.warn('Invalid OTP provided', { email });
      throw new AppError(
        'Invalid OTP. Please check and try again.',
        400,
        AuthErrorCode.INVALID_OTP,
        'otp'
      );
    }

    // Update user: mark email as verified and clear OTP
    const now = new Date().toISOString();
    const { error: updateError } = await (supabase.from('users') as any).update({
      email_verified: true,
      email_verification_otp: null,
      email_otp_expires_at: null,
      updated_at: now,
    }).eq('email', email);

    if (updateError) {
      logger.error('Failed to update user email verification status', {
        error: updateError,
        email,
      });
      throw new AppError(
        'Failed to verify email. Please try again.',
        500,
        'DATABASE_ERROR'
      );
    }

    // Generate JWT token
    const token = generateToken({
      email: userData.email,
      user_id: userData.user_id,
      user_type: userData.user_type,
      email_verified: true,
    });

    // Send welcome email
    try {
      if (config.enableEmailVerification) {
        await sendWelcomeEmail(email, userData.full_name);
      }
    } catch (emailError) {
      logger.warn('Failed to send welcome email after verification', {
        error: emailError,
        email,
      });
      // Don't throw - email verification was successful
    }

    logger.info('Email verified successfully', { user_id: userData.user_id, email });

    return {
      user_id: userData.user_id,
      email,
      email_verified: true,
      token,
      expiresIn: getTokenExpirationMs(),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Unexpected error during email verification', { error });
    throw new AppError(
      'An unexpected error occurred during email verification',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Resend OTP email
 */
export const resendOtpEmail = async (
  request: ResendOtpRequest
): Promise<{ email: string; message: string }> => {
  const supabase = getSupabaseClient();

  try {
    const { email } = request;

    logger.info('Starting OTP resend', { email });

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('user_id, email_verified, full_name')
      .eq('email', email)
      .single();

    if (!user || findError) {
      logger.warn('OTP resend attempt for non-existent user', { email });
      throw new AppError(
        'Email not found. Please register first.',
        404,
        AuthErrorCode.EMAIL_NOT_FOUND,
        'email'
      );
    }

    const resendUser = user as any;

    // Check if email already verified
    if (resendUser.email_verified) {
      logger.warn('OTP resend attempt for already verified email', { email });
      throw new AppError(
        'Email is already verified. Please sign in to continue.',
        400,
        AuthErrorCode.EMAIL_NOT_VERIFIED,
        'email'
      );
    }

    // Generate new OTP
    const newOtp = generateOtp();
    const newOtpExpiresAt = calculateOtpExpiration();

    // Update user with new OTP
    const now = new Date().toISOString();
    const { error: updateError } = await (supabase.from('users') as any).update({
      email_verification_otp: newOtp,
      email_otp_expires_at: newOtpExpiresAt.toISOString(),
      updated_at: now,
    }).eq('email', email);

    if (updateError) {
      logger.error('Failed to update OTP', { error: updateError, email });
      throw new AppError(
        'Failed to resend OTP. Please try again.',
        500,
        'DATABASE_ERROR'
      );
    }

    // Send OTP email
    try {
      if (config.enableEmailVerification) {
        await sendOtpEmail(email, newOtp, resendUser.full_name);
      }
    } catch (emailError) {
      logger.error('Failed to send OTP email during resend', {
        error: emailError,
        email,
      });

      throw new AppError(
        'Failed to send verification email. Please try again later.',
        500,
        AuthErrorCode.EMAIL_SEND_FAILED
      );
    }

    logger.info('OTP resent successfully', { email });

    return {
      email,
      message: 'OTP has been resent to your email. Please check your inbox.',
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Unexpected error during OTP resend', { error });
    throw new AppError(
      'An unexpected error occurred during OTP resend',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Sign in user with email and password
 */
export const signInUser = async (
  request: SignInRequest
): Promise<{ user_id: string; email: string; user_type: string; email_verified: boolean; token: string; expiresIn: number }> => {
  const supabase = getSupabaseClient();

  try {
    const { email, password } = request;

    logger.info('Starting user sign in', { email });

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('user_id, email, password_hash, user_type, email_verified, is_active, account_locked_until, failed_login_attempts')
      .eq('email', email)
      .single();

    if (!user || findError) {
      logger.warn('Sign in attempt for non-existent user', { email });
      throw new AppError(
        'Invalid email or password. Please try again.',
        401,
        AuthErrorCode.INVALID_CREDENTIALS,
        'email'
      );
    }

    const userData = user as any;

    // Check if account is locked
    if (userData.account_locked_until) {
      const lockUntil = new Date(userData.account_locked_until);
      if (lockUntil > new Date()) {
        logger.warn('Sign in attempt on locked account', { email });
        const remainingMinutes = Math.ceil((lockUntil.getTime() - new Date().getTime()) / 60000);
        throw new AppError(
          `Account is locked. Try again in ${remainingMinutes} minutes.`,
          401,
          AuthErrorCode.ACCOUNT_LOCKED
        );
      }
    }

    // Check if account is active
    if (!userData.is_active) {
      logger.warn('Sign in attempt on inactive account', { email });
      throw new AppError(
        'Your account has been deactivated. Contact support for assistance.',
        401,
        AuthErrorCode.ACCOUNT_INACTIVE
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, userData.password_hash);
    if (!isPasswordValid) {
      logger.warn('Invalid password for sign in', { email });

      // Increment failed login attempts
      const newFailedAttempts = (userData.failed_login_attempts || 0) + 1;
      const now = new Date().toISOString();

      if (newFailedAttempts >= config.maxLoginAttempts) {
        // Lock account
        const lockUntilTime = new Date();
        lockUntilTime.setMinutes(lockUntilTime.getMinutes() + config.accountLockTimeMinutes);

        await (supabase.from('users') as any).update({
          failed_login_attempts: newFailedAttempts,
          account_locked_until: lockUntilTime.toISOString(),
          updated_at: now,
        }).eq('email', email);

        logger.warn('Account locked due to failed login attempts', { email });
        throw new AppError(
          `Too many failed attempts. Account locked for ${config.accountLockTimeMinutes} minutes.`,
          401,
          AuthErrorCode.ACCOUNT_LOCKED
        );
      }

      // Update failed attempts
      await (supabase.from('users') as any).update({
        failed_login_attempts: newFailedAttempts,
        updated_at: now,
      }).eq('email', email);

      throw new AppError(
        'Invalid email or password. Please try again.',
        401,
        AuthErrorCode.INVALID_CREDENTIALS
      );
    }

    // Check if email is verified
    if (!userData.email_verified) {
      logger.warn('Sign in attempt with unverified email', { email });
      throw new AppError(
        'Please verify your email before signing in.',
        403,
        AuthErrorCode.EMAIL_NOT_VERIFIED,
        'email'
      );
    }

    // Generate JWT token
    const token = generateToken({
      email: userData.email,
      user_id: userData.user_id,
      user_type: userData.user_type,
      email_verified: userData.email_verified,
    });

    // Update last login and reset failed attempts
    const now = new Date().toISOString();
    await (supabase.from('users') as any).update({
      last_login_at: now,
      failed_login_attempts: 0,
      account_locked_until: null,
      updated_at: now,
    }).eq('email', email);

    logger.info('User signed in successfully', {
      user_id: userData.user_id,
      email: userData.email,
    });

    return {
      user_id: userData.user_id,
      email: userData.email,
      user_type: userData.user_type,
      email_verified: userData.email_verified,
      token,
      expiresIn: getTokenExpirationMs(),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Unexpected error during sign in', { error });
    throw new AppError(
      'An unexpected error occurred during sign in',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Log out user (currently a placeholder as JWT is stateless)
 * In the future, can implement token blacklist if needed
 */
export const logoutUser = async (email: string): Promise<void> => {
  const supabase = getSupabaseClient();

  try {
    logger.info('User logout initiated', { email });

    // Update last activity timestamp if needed for logging purposes
    const now = new Date().toISOString();
    await (supabase.from('users') as any).update({
      updated_at: now,
    }).eq('email', email);

    logger.info('User logged out successfully', { email });
  } catch (error) {
    logger.error('Error during logout', { error, email });
    // Don't throw - logout should always succeed client-side
  }
};

export default {
  registerUser,
  verifyEmailUser,
  resendOtpEmail,
  signInUser,
  logoutUser,
};
