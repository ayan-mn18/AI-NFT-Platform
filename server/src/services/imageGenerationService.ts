/**
 * Image Generation Service
 * Handles AI image generation using Gemini API and S3 storage
 */

import { getGeminiClient } from '../config/gemini';
import { getS3Client } from '../config/aws';
import { getSupabaseClient } from '../config/supabase';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import config from '../config/env';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../types';

interface GeneratedImage {
  imageId: string;
  imageUrl: string;
  s3Key: string;
  prompt: string;
  timestamp: Date;
}

interface ImageGenerationResult {
  success: boolean;
  image?: GeneratedImage;
  error?: string;
}

/**
 * Generate image using Gemini API and store in S3
 * @param userId - User ID for tracking and storage
 * @param chatId - Chat ID to associate the image with
 * @param prompt - Text prompt for image generation
 * @returns Image generation result with S3 URL
 */
export const generateAndStoreImage = async (
  userId: string,
  chatId: string,
  prompt: string
): Promise<ImageGenerationResult> => {
  try {
    logger.info('Starting image generation', { userId, chatId, promptLength: prompt.length });

    // Step 1: Generate image using Gemini API
    const geminiClient = getGeminiClient();
    const model = geminiClient.getGenerativeModel({ 
      model: 'gemini-2.5-flash-image' 
    });

    const result = await model.generateContent(prompt);

    const response = await result.response;
    
    // Extract image data from response
    // Gemini returns images as base64 encoded data
    if (!response.candidates || response.candidates.length === 0) {
      logger.error('No image candidates in response', { response: JSON.stringify(response) });
      throw new AppError('No image generated from API', 500, 'IMAGE_GENERATION_FAILED');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      logger.error('Invalid response structure', { candidate: JSON.stringify(candidate) });
      throw new AppError('Invalid response structure from image API', 500, 'IMAGE_GENERATION_FAILED');
    }

    // Find the inline data part (image)
    const imagePart = candidate.content.parts.find(part => part.inlineData);
    if (!imagePart || !imagePart.inlineData) {
      logger.error('No image data in response', { parts: JSON.stringify(candidate.content.parts) });
      throw new AppError('No image data in API response', 500, 'IMAGE_GENERATION_FAILED');
    }

    const imageData = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType || 'image/png';

    logger.info('Image data extracted successfully', { 
      mimeType, 
      dataLength: imageData.length 
    });

    // Step 2: Upload to S3
    const imageId = uuidv4();
    const timestamp = new Date();
    const datePrefix = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const s3Key = `generated-images/${userId}/${datePrefix}/${imageId}.png`;

    const s3Client = getS3Client();
    const imageBuffer = Buffer.from(imageData, 'base64');

    const uploadCommand = new PutObjectCommand({
      Bucket: config.awsS3Bucket,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: mimeType,
      Metadata: {
        userId,
        chatId,
        imageId,
        prompt: prompt.substring(0, 500), // Store truncated prompt
        generatedAt: timestamp.toISOString(),
      },
    });

    await s3Client.send(uploadCommand);

    const imageUrl = `${config.awsS3Url}/${s3Key}`;

    logger.info('Image generated and uploaded successfully', {
      imageId,
      s3Key,
      imageUrl,
      userId,
      chatId,
    });

    // Step 3: Store reference in database (messages table)
    const supabase = getSupabaseClient();
    const messageId = uuidv4();

    await (supabase.from('messages') as any).insert({
      message_id: messageId,
      chat_id: chatId,
      role: 'assistant',
      content: `Generated image from prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
      metadata: {
        type: 'image',
        imageId,
        imageUrl,
        s3Key,
        prompt,
        mimeType,
        generatedAt: timestamp.toISOString(),
      },
      tokens_consumed: 0, // Image generation doesn't consume text tokens
      created_at: timestamp.toISOString(),
    });

    return {
      success: true,
      image: {
        imageId,
        imageUrl,
        s3Key,
        prompt,
        timestamp,
      },
    };
  } catch (error) {
    logger.error('Image generation failed', {
      error,
      userId,
      chatId,
      prompt: prompt.substring(0, 100),
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'Failed to generate image',
      500,
      'IMAGE_GENERATION_FAILED'
    );
  }
};

/**
 * Get user's generated images from a specific chat
 * @param chatId - Chat ID to retrieve images from
 * @param limit - Maximum number of images to return
 * @returns Array of generated images
 */
export const getChatImages = async (
  chatId: string,
  limit: number = 50
): Promise<GeneratedImage[]> => {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('messages')
      .select('message_id, content, metadata, created_at')
      .eq('chat_id', chatId)
      .eq('role', 'assistant')
      .not('metadata->type', 'is', null)
      .eq('metadata->type', 'image')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new AppError('Failed to retrieve images', 500, 'DATABASE_ERROR');
    }

    return (data || []).map((msg: any) => ({
      imageId: msg.metadata.imageId,
      imageUrl: msg.metadata.imageUrl,
      s3Key: msg.metadata.s3Key,
      prompt: msg.metadata.prompt,
      timestamp: new Date(msg.created_at),
    }));
  } catch (error) {
    logger.error('Failed to get chat images', { error, chatId });
    throw error;
  }
};

/**
 * Get all generated images for a user across all chats
 * @param userId - User ID
 * @param limit - Maximum number of images to return
 * @returns Array of generated images
 */
export const getUserImages = async (
  userId: string,
  limit: number = 100
): Promise<GeneratedImage[]> => {
  try {
    const supabase = getSupabaseClient();

    // Join messages with chats to filter by user_id
    const { data, error } = await supabase
      .from('messages')
      .select(`
        message_id,
        content,
        metadata,
        created_at,
        chats!inner(user_id)
      `)
      .eq('chats.user_id', userId)
      .eq('role', 'assistant')
      .not('metadata->type', 'is', null)
      .eq('metadata->type', 'image')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new AppError('Failed to retrieve user images', 500, 'DATABASE_ERROR');
    }

    return (data || []).map((msg: any) => ({
      imageId: msg.metadata.imageId,
      imageUrl: msg.metadata.imageUrl,
      s3Key: msg.metadata.s3Key,
      prompt: msg.metadata.prompt,
      timestamp: new Date(msg.created_at),
    }));
  } catch (error) {
    logger.error('Failed to get user images', { error, userId });
    throw error;
  }
};
