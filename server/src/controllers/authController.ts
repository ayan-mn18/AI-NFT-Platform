/**
 * Auth Controllers
 * Business logic for authentication endpoints
 * 
 * Controllers to implement:
 * - register
 * - verifyEmail
 * - signin
 * - resendOtp
 * - logout
 */

import { Response } from 'express';
import { AuthenticatedRequest, RegisterRequest, VerifyEmailRequest, ResendOtpRequest, SignInRequest, AppError } from '../types';
import logger from '../config/logger';
import { registerUser, verifyEmailUser, resendOtpEmail, signInUser, logoutUser } from '../services/authService';
import { getTokenExpirationMs } from '../utils/jwtService';
import config from '../config/env';

/**
 * Register endpoint handler
 * POST /auth/register
 * 
 * Accepts: email, password, user_type, full_name (optional)
 * Returns: 201 with user_id, email, user_type, email_verified, created_at
 * Errors: 409 (email exists), 400 (validation), 500 (server error)
 */
export const register = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, user_type, full_name } = req.body as RegisterRequest;

    logger.info('Register endpoint called', { email, user_type });

    // Call service
    const result = await registerUser({
      email,
      password,
      user_type,
      full_name,
    });

    // Return success response (201 Created)
    res.status(201).json({
      status: 'success',
      message: 'Registration successful. Check your email for OTP verification.',
      data: {
        user_id: result.user_id,
        email: result.email,
        user_type: result.user_type,
        email_verified: result.email_verified,
        created_at: new Date().toISOString(),
      },
    });

    logger.info('User registration successful', {
      user_id: result.user_id,
      email: result.email,
    });
  } catch (error) {
    logger.error('Register endpoint error', { error });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
        ...(error.field && { field: error.field }),
        ...(error.details && { details: error.details }),
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * Verify email with OTP endpoint handler
 * POST /auth/verify-email
 * 
 * Accepts: email, otp (6-digit)
 * Returns: 200 with user_id, email, email_verified, and auth cookie
 * Errors: 404 (email not found), 400 (invalid/expired OTP), 500 (server error)
 */
export const verifyEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, otp } = req.body as VerifyEmailRequest;

    logger.info('Verify Email endpoint called', { email });

    // Call service
    const result = await verifyEmailUser({
      email,
      otp,
    });

    // Set authentication cookie (same as signin)
    const tokenExpirationMs = getTokenExpirationMs();
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: tokenExpirationMs,
      path: '/',
    });

    // Return success response (200 OK)
    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully. Welcome!',
      data: {
        user_id: result.user_id,
        email: result.email,
        email_verified: result.email_verified,
      },
    });

    logger.info('Email verification successful', {
      user_id: result.user_id,
      email: result.email,
    });
  } catch (error) {
    logger.error('Verify Email endpoint error', { error });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
        ...(error.field && { field: error.field }),
        ...(error.details && { details: error.details }),
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * Sign in endpoint handler
 * POST /auth/signin
 * 
 * Accepts: email, password
 * Returns: 200 with user_id, email, user_type, email_verified, and auth cookie
 * Errors: 401 (invalid credentials, locked account), 403 (unverified email), 500 (server error)
 */
export const signin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body as SignInRequest;

    logger.info('Sign In endpoint called', { email });

    // Call service
    const result = await signInUser({
      email,
      password,
    });

    // Set authentication cookie
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: result.expiresIn,
      path: '/',
    });

    // Return success response (200 OK)
    res.status(200).json({
      status: 'success',
      message: 'Sign in successful.',
      data: {
        user_id: result.user_id,
        email: result.email,
        user_type: result.user_type,
        email_verified: result.email_verified,
      },
    });

    logger.info('User signed in successfully', {
      user_id: result.user_id,
      email: result.email,
    });
  } catch (error) {
    logger.error('Sign In endpoint error', { error });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
        ...(error.field && { field: error.field }),
        ...(error.details && { details: error.details }),
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * Resend OTP endpoint handler
 * POST /auth/resend-otp
 * 
 * Accepts: email
 * Returns: 200 with email and message
 * Errors: 404 (email not found), 400 (already verified), 429 (rate limited), 500 (server error)
 */
export const resendOtp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.body as ResendOtpRequest;

    logger.info('Resend OTP endpoint called', { email });

    // Call service
    const result = await resendOtpEmail({
      email,
    });

    // Return success response (200 OK)
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        email: result.email,
      },
    });

    logger.info('OTP resent successfully', { email });
  } catch (error) {
    logger.error('Resend OTP endpoint error', { error });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
        ...(error.field && { field: error.field }),
        ...(error.details && { details: error.details }),
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * Logout endpoint handler
 * POST /auth/logout
 * 
 * Accepts: email (optional, for logging)
 * Returns: 200 with success message
 * Errors: 500 (server error)
 */
export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = req.user?.email;

    logger.info('Logout endpoint called', { email });

    // Call service to update last activity (optional)
    if (email) {
      await logoutUser(email);
    }

    // Clear authentication cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
    });

    // Return success response (200 OK)
    res.status(200).json({
      status: 'success',
      message: 'Logout successful.',
    });

    logger.info('User logged out successfully', { email });
  } catch (error) {
    logger.error('Logout endpoint error', { error });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};
