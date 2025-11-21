/**
 * User Service
 * Business logic and database operations for user profile
 * 
 * Services implemented:
 * - getUserProfile
 * 
 * Services to implement:
 * - updateUserProfile
 * - changePassword
 * - getActivityLog
 */

import { getSupabaseClient } from '../config/supabase';
import logger from '../config/logger';
import { AppError, UserResponse } from '../types';

/**
 * Get user profile by user_id
 */
export const getUserProfile = async (userId: string): Promise<UserResponse> => {
  const supabase = getSupabaseClient();

  try {
    logger.info('Fetching user profile', { userId });

    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, email, username, full_name, profile_picture_url, bio, user_type, email_verified, is_active, created_at, updated_at, last_login_at')
      .eq('user_id', userId)
      .single();

    if (!user || error) {
      logger.warn('User not found', { userId, error });
      throw new AppError(
        'User profile not found',
        404,
        'USER_NOT_FOUND'
      );
    }

    const userData = user as any;

    logger.info('User profile fetched successfully', { userId });

    return {
      user_id: userData.user_id,
      email: userData.email,
      username: userData.username,
      full_name: userData.full_name,
      profile_picture_url: userData.profile_picture_url,
      bio: userData.bio,
      user_type: userData.user_type,
      email_verified: userData.email_verified,
      is_active: userData.is_active,
      created_at: new Date(userData.created_at),
      updated_at: new Date(userData.updated_at),
      last_login_at: userData.last_login_at ? new Date(userData.last_login_at) : null,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Unexpected error fetching user profile', { userId, error });
    throw new AppError(
      'Failed to fetch user profile',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Placeholder for updateUserProfile service
 */
export const updateUserProfile = async (userId: string, profileData: any) => {
  try {
    logger.info('Update user profile service - not yet implemented', { userId });
    throw new Error('updateUserProfile not implemented');
  } catch (error) {
    logger.error('Update user profile error', { error });
    throw error;
  }
};

/**
 * Placeholder for changePassword service
 */
export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  try {
    logger.info('Change password service - not yet implemented', { userId });
    throw new Error('changePassword not implemented');
  } catch (error) {
    logger.error('Change password error', { error });
    throw error;
  }
};

/**
 * Placeholder for getActivityLog service
 */
export const getActivityLog = async (userId: string, limit: number, offset: number) => {
  try {
    logger.info('Get activity log service - not yet implemented', { userId });
    throw new Error('getActivityLog not implemented');
  } catch (error) {
    logger.error('Get activity log error', { error });
    throw error;
  }
};
