/**
 * File Upload Controller
 * Handles file upload HTTP requests
 */

import { Response } from 'express';
import { AuthenticatedRequest, AppError, FileErrorCode } from '../types';
import logger from '../config/logger';
import { uploadFileToS3, getUserFiles, softDeleteFile } from '../services/fileUploadService';
import { isValidCategory } from '../utils/fileUploadUtils';

/**
 * Upload file endpoint handler
 * POST /file/upload
 * Protected - requires auth_token cookie
 * 
 * Accepts: multipart/form-data with file and category
 * Returns: 200 with file metadata and S3 URL
 * Errors: 400 (validation), 401 (unauthorized), 413 (file too large), 500 (server error)
 */
export const uploadFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      logger.warn('Upload file called without user_id');
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized. Please sign in.',
        code: 'UNAUTHORIZED',
      });
    }

    const { file } = req as any;
    const { category, description } = req.body;

    logger.info('File upload endpoint called', {
      userId,
      filename: file?.originalname,
      category,
    });

    // Validate file presence
    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file provided. Please upload a file.',
        code: FileErrorCode.MISSING_FILE,
      });
    }

    // Validate category
    if (!category || !isValidCategory(category)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or missing file category. Valid categories: profile-pictures, nft-images, documents, thumbnails, banners',
        code: FileErrorCode.INVALID_CATEGORY,
        field: 'category',
      });
    }

    // Call service
    const fileMetadata = await uploadFileToS3(userId, file, category, description);

    // Return success response (200 OK)
    res.status(200).json({
      status: 'success',
      message: 'File uploaded successfully.',
      data: {
        file_id: fileMetadata.file_id,
        s3_url: fileMetadata.s3_url,
        filename: fileMetadata.original_filename,
        size: fileMetadata.file_size,
        mime_type: fileMetadata.mime_type,
        category: fileMetadata.category,
        uploaded_at: fileMetadata.uploaded_at.toISOString(),
      },
    });

    logger.info('File uploaded successfully', {
      fileId: fileMetadata.file_id,
      userId,
      size: fileMetadata.file_size,
    });
  } catch (error) {
    logger.error('File upload endpoint error', { error });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
        ...(error.field && { field: error.field }),
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred during file upload',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * Get user files endpoint handler
 * GET /file/list?category=profile-pictures
 * Protected - requires auth_token cookie
 * 
 * Query params:
 * - category (optional): Filter by file category
 * 
 * Returns: 200 with array of file metadata
 * Errors: 401 (unauthorized), 500 (server error)
 */
export const getUserFilesList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      logger.warn('Get files called without user_id');
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized. Please sign in.',
        code: 'UNAUTHORIZED',
      });
    }

    const { category } = req.query as Record<string, string>;

    logger.info('Get user files endpoint called', { userId, category });

    // Call service
    const files = await getUserFiles(userId, category);

    // Return success response (200 OK)
    res.status(200).json({
      status: 'success',
      message: 'Files retrieved successfully.',
      data: files.map((file) => ({
        file_id: file.file_id,
        filename: file.original_filename,
        s3_url: file.s3_url,
        size: file.file_size,
        mime_type: file.mime_type,
        category: file.category,
        description: file.description,
        uploaded_at: file.uploaded_at.toISOString(),
      })),
    });

    logger.info('User files retrieved', { userId, count: files.length });
  } catch (error) {
    logger.error('Get user files endpoint error', { error });

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
 * Delete file endpoint handler
 * DELETE /file/:fileId
 * Protected - requires auth_token cookie
 * 
 * Returns: 200 with success message
 * Errors: 401 (unauthorized), 404 (not found), 500 (server error)
 */
export const deleteFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { fileId } = req.params;

    if (!userId) {
      logger.warn('Delete file called without user_id');
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized. Please sign in.',
        code: 'UNAUTHORIZED',
      });
    }

    logger.info('Delete file endpoint called', { userId, fileId });

    // Call service
    await softDeleteFile(fileId, userId);

    // Return success response (200 OK)
    res.status(200).json({
      status: 'success',
      message: 'File deleted successfully.',
    });

    logger.info('File deleted successfully', { fileId, userId });
  } catch (error) {
    logger.error('Delete file endpoint error', { error });

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

export default {
  uploadFile,
  getUserFilesList,
  deleteFile,
};
