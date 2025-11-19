/**
 * Auth Routes
 * All authentication endpoints
 * 
 * Endpoints implemented:
 * - POST /auth/register
 * 
 * Endpoints to implement:
 * - POST /auth/verify-email
 * - POST /auth/signin
 * - POST /auth/resend-otp
 * - POST /auth/logout
 */

import { Router } from 'express';
import { register } from '../controllers/authController';
import { validateRequest } from '../middleware/validateRequest';
import { registerLimiter } from '../middleware/rateLimiter';
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

export default router;
