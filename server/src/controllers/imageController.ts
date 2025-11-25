/**
 * Image Generation Controller
 * Handles HTTP requests for AI image generation
 */

import { Response } from 'express';
import { generateAndStoreImage, getChatImages, getUserImages, getUserImagesGroupedByDate, ImagesByDate, ImageWithMetadata } from '../services/imageGenerationService';
import logger from '../config/logger';
import { AppError, AuthenticatedRequest } from '../types';

/**
 * POST /api/gen-image
 * Generate an AI image from a text prompt with optional reference image
 * 
 * Request body:
 * {
 *   chatId: string;
 *   prompt: string;
 *   referenceImage?: {
 *     type: 'base64' | 'url';
 *     data: string; // base64 data or URL (S3 or external)
 *     mimeType?: string; // optional, defaults to 'image/png'
 *   }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     imageId: string;
 *     imageUrl: string;
 *     s3Key: string;
 *     prompt: string;
 *     referenceImageId?: string; // if reference image was used
 *     timestamp: Date;
 *   }
 * }
 */
export const generateImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { chatId, prompt, referenceImage } = req.body;

    // Validation
    if (!chatId || typeof chatId !== 'string') {
      throw new AppError('chatId is required and must be a string', 400, 'VALIDATION_ERROR');
    }

    if (!prompt || typeof prompt !== 'string') {
      throw new AppError('prompt is required and must be a string', 400, 'VALIDATION_ERROR');
    }

    if (prompt.length < 10) {
      throw new AppError('Prompt must be at least 10 characters long', 400, 'VALIDATION_ERROR');
    }

    if (prompt.length > 2000) {
      throw new AppError('Prompt must be less than 2000 characters', 400, 'VALIDATION_ERROR');
    }

    // Validate reference image if provided
    if (referenceImage) {
      if (!referenceImage.type || !['base64', 'url'].includes(referenceImage.type)) {
        throw new AppError('referenceImage.type must be "base64" or "url"', 400, 'VALIDATION_ERROR');
      }

      if (!referenceImage.data || typeof referenceImage.data !== 'string') {
        throw new AppError('referenceImage.data is required and must be a string', 400, 'VALIDATION_ERROR');
      }

      if (referenceImage.type === 'base64' && referenceImage.data.length > 5000000) {
        throw new AppError('Base64 image data is too large (max 5MB)', 400, 'VALIDATION_ERROR');
      }
    }

    logger.info('Image generation request received', {
      userId,
      chatId,
      promptLength: prompt.length,
      hasReference: !!referenceImage,
    });

    // Generate and store image
    const result = await generateAndStoreImage(userId, chatId, prompt, referenceImage);

    if (!result.success || !result.image) {
      throw new AppError(
        result.error || 'Image generation failed',
        500,
        'IMAGE_GENERATION_FAILED'
      );
    }

    res.status(200).json({
      success: true,
      data: result.image,
    });
  } catch (error) {
    logger.error('Error in generateImage controller', { error });
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * GET /api/gen-image/chat/:chatId
 * Get all generated images from a specific chat
 * 
 * Query parameters:
 * - limit?: number (default: 50, max: 100)
 * 
 * Response:
 * {
 *   success: true,
 *   data: GeneratedImage[]
 * }
 */
export const getImagesFromChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { chatId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    if (!chatId) {
      throw new AppError('chatId is required', 400, 'VALIDATION_ERROR');
    }

    const images = await getChatImages(chatId, limit);

    res.status(200).json({
      success: true,
      data: images,
      count: images.length,
    });
  } catch (error) {
    logger.error('Error in getImagesFromChat controller', { error });
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * GET /api/gen-image/user
 * Get all generated images for the authenticated user grouped by date
 * 
 * Query parameters:
 * - limit?: number (default: 500, max: 1000)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     "25/11/2025": [
 *       { imageId, imageUrl, s3Key, prompt, timestamp },
 *       ...
 *     ],
 *     "22/11/2025": [...]
 *   },
 *   totalImages: 10
 * }
 */
export const getUserGeneratedImages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);

    const imagesByDate = await getUserImagesGroupedByDate(userId, limit);

    // Convert array to object format: { "25/11/2025": [...], "22/11/2025": [...] }
    const groupedData: Record<string, ImageWithMetadata[]> = {};
    let totalImages = 0;

    imagesByDate.forEach((group: ImagesByDate) => {
      groupedData[group.date] = group.images;
      totalImages += group.images.length;
    });

    res.status(200).json({
      success: true,
      data: groupedData,
      totalImages,
    });
  } catch (error) {
    logger.error('Error in getUserGeneratedImages controller', { error });
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * GET /api/gen-image/user/history
 * Get all generated images for the authenticated user grouped by date
 * 
 * Query parameters:
 * - limit?: number (default: 500, max: 1000)
 * 
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       date: "25/11/2025",
 *       images: ["https://...", "https://..."]
 *     },
 *     {
 *       date: "22/11/2025",
 *       images: ["https://...", "https://..."]
 *     }
 *   ]
 * }
 */
export const getUserImageHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);

    const imagesByDate = await getUserImagesGroupedByDate(userId, limit);

    res.status(200).json({
      success: true,
      data: imagesByDate,
      totalDates: imagesByDate.length,
      totalImages: imagesByDate.reduce((sum, group) => sum + group.images.length, 0),
    });
  } catch (error) {
    logger.error('Error in getUserImageHistory controller', { error });
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};
