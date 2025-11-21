/**
 * User Controllers
 * Business logic for user profile and account endpoints
 * 
 * Controllers implemented:
 * - getProfile
 * 
 * Controllers to implement:
 * - updateProfile
 * - changePassword
 * - getActivityLog
 */

import { Response } from 'express';
import { AuthenticatedRequest, AppError } from '../types';
import logger from '../config/logger';
import { getUserProfile } from '../services/userService';

/**
 * Get user profile endpoint handler
 * GET /user/profile
 * Protected - requires auth_token cookie
 * 
 * Returns: 200 with user profile data
 * Errors: 404 (user not found), 401 (unauthorized), 500 (server error)
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // User is already authenticated by verifyAuth middleware
    const userId = req.user?.user_id;

    if (!userId) {
      logger.warn('Get Profile called without user_id');
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized. Please sign in.',
        code: 'UNAUTHORIZED',
      });
    }

    logger.info('Get Profile endpoint called', { userId });

    // Call service
    const profile = await getUserProfile(userId);

    // Return success response (200 OK)
    res.status(200).json({
      status: 'success',
      message: 'User profile retrieved successfully.',
      data: profile,
    });

    logger.info('User profile retrieved successfully', { userId });
  } catch (error) {
    logger.error('Get Profile endpoint error', { error });

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

/**
 * Placeholder for updateProfile controller
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info('Update Profile endpoint called - not yet implemented');
    res.status(501).json({
      status: 'error',
      message: 'Update Profile endpoint not yet implemented',
      code: 'NOT_IMPLEMENTED',
    });
  } catch (error) {
    logger.error('Update Profile error', { error });
    throw error;
  }
};

/**
 * Placeholder for changePassword controller
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info('Change Password endpoint called - not yet implemented');
    res.status(501).json({
      status: 'error',
      message: 'Change Password endpoint not yet implemented',
      code: 'NOT_IMPLEMENTED',
    });
  } catch (error) {
    logger.error('Change Password error', { error });
    throw error;
  }
};

/**
 * Placeholder for getActivityLog controller
 */
export const getActivityLog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info('Get Activity Log endpoint called - not yet implemented');
    res.status(501).json({
      status: 'error',
      message: 'Get Activity Log endpoint not yet implemented',
      code: 'NOT_IMPLEMENTED',
    });
  } catch (error) {
    logger.error('Get Activity Log error', { error });
    throw error;
  }
};
