import config from '../config/env';
import logger from '../config/logger';
import { AppError, FileErrorCode } from '../types';

/**
 * File Upload Utilities
 * Handles file validation, naming, and path organization
 */

/**
 * Validate file before upload
 */
export const validateFile = (
  file: any,
  allowedTypes?: string[]
): void => {
  if (!file) {
    throw new AppError(
      'No file provided. Please upload a file.',
      400,
      FileErrorCode.MISSING_FILE
    );
  }

  // Check file size
  if (file.size > config.maxFileSize) {
    throw new AppError(
      `File size exceeds maximum limit of ${Math.round(config.maxFileSize / (1024 * 1024))}MB`,
      400,
      FileErrorCode.FILE_TOO_LARGE,
      'file'
    );
  }

  // Check file type
  const typesToCheck = allowedTypes || config.allowedFileTypes;
  if (!typesToCheck.includes(file.mimetype)) {
    throw new AppError(
      `File type not allowed. Allowed types: ${typesToCheck.join(', ')}`,
      400,
      FileErrorCode.INVALID_FILE_TYPE,
      'file'
    );
  }

  logger.info('File validation passed', {
    filename: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
  });
};

/**
 * Generate unique filename
 * Format: {category}/{user_id}/{timestamp}-{random}-{originalname}
 */
export const generateS3Key = (
  userId: string,
  category: string,
  originalFilename: string
): string => {
  // Sanitize filename
  const sanitizedName = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars
    .replace(/\s+/g, '_') // Replace spaces
    .toLowerCase();

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${timestamp}-${random}-${sanitizedName}`;

  // Return S3 key path
  const s3Key = `${category}/${userId}/${filename}`;

  logger.debug('Generated S3 key', {
    original: originalFilename,
    s3Key,
  });

  return s3Key;
};

/**
 * Get public S3 URL
 */
export const getS3PublicUrl = (s3Key: string): string => {
  // If using CloudFront, construct URL
  // If using direct S3, construct S3 URL
  return `${config.awsS3Url}/${s3Key}`;
};

/**
 * Validate file category
 */
export const isValidCategory = (category: string): boolean => {
  const validCategories = Object.values({
    PROFILE_PICTURES: 'profile-pictures',
    NFT_IMAGES: 'nft-images',
    DOCUMENTS: 'documents',
    THUMBNAILS: 'thumbnails',
    BANNERS: 'banners',
  });

  return validCategories.includes(category);
};

/**
 * Get file extension
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Check if file is image
 */
export const isImageFile = (mimetype: string): boolean => {
  return mimetype.startsWith('image/');
};

/**
 * Check if file is document
 */
export const isDocumentFile = (mimetype: string): boolean => {
  const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  return documentTypes.includes(mimetype);
};

/**
 * Get human-readable file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Extract MIME type from file extension (fallback)
 */
export const getMimeType = (filename: string): string => {
  const ext = getFileExtension(filename).toLowerCase();

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return mimeTypes[ext] || 'application/octet-stream';
};

export default {
  validateFile,
  generateS3Key,
  getS3PublicUrl,
  isValidCategory,
  getFileExtension,
  isImageFile,
  isDocumentFile,
  formatFileSize,
  getMimeType,
};
