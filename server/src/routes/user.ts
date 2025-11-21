/**
 * User Routes
 * All user profile and account endpoints
 * 
 * Endpoints implemented:
 * - GET /user/profile (protected)
 * 
 * Endpoints to implement:
 * - PUT /user/profile (protected)
 * - PUT /user/change-password (protected)
 * - GET /user/activity-log (protected)
 */

import { Router } from 'express';
import { getProfile } from '../controllers/userController';
import { verifyAuth } from '../middleware/verifyAuth';

const router = Router();

/**
 * GET /user/profile
 * Get current user's profile information
 * Protected route - requires valid auth_token cookie
 * 
 * Response (200 OK):
 * {
 *   status: 'success'
 *   message: 'User profile retrieved successfully.'
 *   data: {
 *     user_id: UUID
 *     email: string
 *     username: string | null
 *     full_name: string | null
 *     profile_picture_url: string | null
 *     bio: string | null
 *     user_type: 'merchant' | 'buyer'
 *     email_verified: boolean
 *     is_active: boolean
 *     created_at: ISO timestamp
 *     updated_at: ISO timestamp
 *     last_login_at: ISO timestamp | null
 *   }
 * }
 */
router.get('/profile', verifyAuth, getProfile);

export default router;
