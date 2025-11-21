/**
 * Auth Routes
 * All authentication endpoints
 * 
 * Endpoints implemented:
 * - POST /auth/register
 * - POST /auth/verify-email
 * - POST /auth/resend-otp
 * - POST /auth/signin
 * - POST /auth/logout
 */

import { Router } from 'express';
import { register, verifyEmail, resendOtp, signin, logout } from '../controllers/authController';
import { validateRequest } from '../middleware/validateRequest';
import { registerLimiter, otpResendLimiter, authLimiter } from '../middleware/rateLimiter';
import { verifyAuth } from '../middleware/verifyAuth';
import Joi from 'joi';

const router = Router();

/**
 * POST /auth/register
 * Register a new user with email and password
 * 
 * Request body:
 * {
 *   email: string (valid email)
 *   password: string (8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
 *   user_type: 'merchant' | 'buyer'
 *   full_name?: string (optional)
 * }
 * 
 * Response (201 Created):
 * {
 *   status: 'success'
 *   message: 'Registration successful. Check your email for OTP verification.'
 *   data: {
 *     user_id: UUID
 *     email: string
 *     user_type: 'merchant' | 'buyer'
 *     email_verified: false
 *     created_at: ISO string
 *   }
 * }
 */

router.post(
  '/register',
  registerLimiter,
  register
);

/**
 * POST /auth/verify-email
 * Verify user email with OTP code
 * 
 * Request body:
 * {
 *   email: string (valid email)
 *   otp: string (6-digit code)
 * }
 * 
 * Response (200 OK):
 * {
 *   status: 'success'
 *   message: 'Email verified successfully. Welcome!'
 *   data: {
 *     user_id: UUID
 *     email: string
 *     email_verified: true
 *   }
 * }
 */
router.post(
  '/verify-email',
  verifyEmail
);

/**
 * POST /auth/resend-otp
 * Resend OTP verification email
 * 
 * Request body:
 * {
 *   email: string (valid email)
 * }
 * 
 * Response (200 OK):
 * {
 *   status: 'success'
 *   message: 'OTP has been resent to your email. Please check your inbox.'
 *   data: {
 *     email: string
 *   }
 * }
 */
router.post(
  '/resend-otp',
  otpResendLimiter,
  validateRequest(
    Joi.object({
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required',
        }),
    })
  ),
  resendOtp
);

/**
 * POST /auth/signin
 * Sign in user with email and password
 * 
 * Request body:
 * {
 *   email: string (valid email)
 *   password: string
 * }
 * 
 * Response (200 OK):
 * {
 *   status: 'success'
 *   message: 'Sign in successful.'
 *   data: {
 *     user_id: UUID
 *     email: string
 *     user_type: 'merchant' | 'buyer'
 *     email_verified: boolean
 *   }
 * }
 * 
 * Sets auth_token cookie with JWT token
 */
router.post(
  '/signin',
  authLimiter,
  signin
);

/**
 * POST /auth/logout
 * Log out user and clear authentication session
 * 
 * Request body: {} (empty)
 * 
 * Response (200 OK):
 * {
 *   status: 'success'
 *   message: 'Logout successful.'
 * }
 * 
 * Clears auth_token cookie
 */
router.post(
  '/logout',
  verifyAuth,
  logout
);

export default router;
