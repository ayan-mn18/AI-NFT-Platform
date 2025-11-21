import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { getS3Client } from '../config/aws';
import { getSupabaseClient } from '../config/supabase';
import logger from '../config/logger';
import config from '../config/env';
import { AppError, FileErrorCode, FileMetadata } from '../types';
import { generateS3Key, getS3PublicUrl, validateFile } from '../utils/fileUploadUtils';

/**
 * AWS S3 Upload Service
 * Handles file uploads to S3 and metadata storage in database
 */

/**
 * Upload file to S3 and store metadata in database
 */
export const uploadFileToS3 = async (
  userId: string,
  file: any,
  category: string,
  description?: string
): Promise<FileMetadata> => {
  const supabase = getSupabaseClient();
  const s3Client = getS3Client();

  const fileId = uuidv4();

  try {
    logger.info('Starting file upload to S3', {
      userId,
      filename: file.originalname,
      size: file.size,
      category,
    });

    // Validate file
    validateFile(file);

    // Generate S3 key path
    const s3Key = generateS3Key(userId, category, file.originalname);
    const s3Url = getS3PublicUrl(s3Key);

    // Upload to S3
    const uploadParams = {
      Bucket: config.awsS3Bucket,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        userId: userId,
        fileId: fileId,
        uploadedAt: new Date().toISOString(),
        originalFilename: file.originalname,
      },
      // Add cache control headers
      CacheControl: 'public, max-age=31536000', // 1 year
    };

    const uploadCommand = new PutObjectCommand(uploadParams);
    await s3Client.send(uploadCommand);

    logger.info('File uploaded to S3 successfully', {
      fileId,
      s3Key,
      size: file.size,
    });

    // Store metadata in database
    const now = new Date().toISOString();
    const { error: dbError } = await (supabase.from('file_uploads') as any).insert({
      file_id: fileId,
      user_id: userId,
      original_filename: file.originalname,
      s3_key: s3Key,
      s3_url: s3Url,
      file_size: file.size,
      mime_type: file.mimetype,
      category,
      description: description || null,
      uploaded_at: now,
      is_deleted: false,
    });

    if (dbError) {
      logger.error('Failed to store file metadata', { error: dbError, fileId });
      // Delete from S3 if DB insert fails
      await deleteFileFromS3(s3Key);
      throw new AppError(
        'Failed to store file metadata',
        500,
        FileErrorCode.UPLOAD_FAILED
      );
    }

    logger.info('File metadata stored in database', { fileId, userId });

    return {
      file_id: fileId,
      user_id: userId,
      original_filename: file.originalname,
      s3_key: s3Key,
      s3_url: s3Url,
      file_size: file.size,
      mime_type: file.mimetype,
      category,
      description,
      uploaded_at: new Date(now),
      is_deleted: false,
    };
  } catch (error) {
    logger.error('Error during file upload', { error, fileId, userId });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'Failed to upload file to S3',
      500,
      FileErrorCode.UPLOAD_FAILED
    );
  }
};

/**
 * Delete file from S3
 */
export const deleteFileFromS3 = async (s3Key: string): Promise<void> => {
  const s3Client = getS3Client();

  try {
    logger.info('Deleting file from S3', { s3Key });

    const deleteParams = {
      Bucket: config.awsS3Bucket,
      Key: s3Key,
    };

    const deleteCommand = new DeleteObjectCommand(deleteParams);
    await s3Client.send(deleteCommand);

    logger.info('File deleted from S3 successfully', { s3Key });
  } catch (error) {
    logger.error('Failed to delete file from S3', { error, s3Key });
    throw new AppError(
      'Failed to delete file from S3',
      500,
      FileErrorCode.UPLOAD_FAILED
    );
  }
};

/**
 * Check if file exists in S3
 */
export const fileExistsInS3 = async (s3Key: string): Promise<boolean> => {
  const s3Client = getS3Client();

  try {
    const headParams = {
      Bucket: config.awsS3Bucket,
      Key: s3Key,
    };

    const headCommand = new HeadObjectCommand(headParams);
    await s3Client.send(headCommand);

    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }

    logger.error('Error checking file existence in S3', { error, s3Key });
    return false;
  }
};

/**
 * Get file metadata from database
 */
export const getFileMetadata = async (
  fileId: string,
  userId: string
): Promise<FileMetadata> => {
  const supabase = getSupabaseClient();

  try {
    const { data: file, error } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('file_id', fileId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (!file || error) {
      logger.warn('File not found', { fileId, userId });
      throw new AppError(
        'File not found',
        404,
        FileErrorCode.FILE_NOT_FOUND
      );
    }

    const fileData = file as any;

    return {
      file_id: fileData.file_id,
      user_id: fileData.user_id,
      original_filename: fileData.original_filename,
      s3_key: fileData.s3_key,
      s3_url: fileData.s3_url,
      file_size: fileData.file_size,
      mime_type: fileData.mime_type,
      category: fileData.category,
      description: fileData.description,
      uploaded_at: new Date(fileData.uploaded_at),
      is_deleted: fileData.is_deleted,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Error fetching file metadata', { error, fileId, userId });
    throw new AppError(
      'Failed to retrieve file metadata',
      500,
      FileErrorCode.UPLOAD_FAILED
    );
  }
};

/**
 * Soft delete file (mark as deleted without removing from S3)
 */
export const softDeleteFile = async (
  fileId: string,
  userId: string
): Promise<void> => {
  const supabase = getSupabaseClient();

  try {
    const now = new Date().toISOString();
    const { error } = await (supabase.from('file_uploads') as any).update({
      is_deleted: true,
      updated_at: now,
    }).eq('file_id', fileId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to soft delete file', { error, fileId, userId });
      throw new AppError(
        'Failed to delete file',
        500,
        FileErrorCode.UPLOAD_FAILED
      );
    }

    logger.info('File soft deleted', { fileId, userId });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Error during file deletion', { error, fileId, userId });
    throw new AppError(
      'Failed to delete file',
      500,
      FileErrorCode.UPLOAD_FAILED
    );
  }
};

/**
 * Get user's uploaded files
 */
export const getUserFiles = async (
  userId: string,
  category?: string
): Promise<FileMetadata[]> => {
  const supabase = getSupabaseClient();

  try {
    let query = supabase
      .from('file_uploads')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: files, error } = await query;

    if (error) {
      logger.error('Failed to fetch user files', { error, userId });
      throw error;
    }

    return (files || []).map((file: any) => ({
      file_id: file.file_id,
      user_id: file.user_id,
      original_filename: file.original_filename,
      s3_key: file.s3_key,
      s3_url: file.s3_url,
      file_size: file.file_size,
      mime_type: file.mime_type,
      category: file.category,
      description: file.description,
      uploaded_at: new Date(file.uploaded_at),
      is_deleted: file.is_deleted,
    }));
  } catch (error) {
    logger.error('Error fetching user files', { error, userId });
    throw new AppError(
      'Failed to fetch files',
      500,
      FileErrorCode.UPLOAD_FAILED
    );
  }
};

export default {
  uploadFileToS3,
  deleteFileFromS3,
  fileExistsInS3,
  getFileMetadata,
  softDeleteFile,
  getUserFiles,
};
