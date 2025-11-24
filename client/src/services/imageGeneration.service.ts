/**
 * Image Generation Service
 * Client-side service for AI image generation
 */

import axiosInstance from '../lib/axios';

export interface GenerateImageRequest {
  chatId: string;
  prompt: string;
}

export interface GeneratedImage {
  imageId: string;
  imageUrl: string;
  s3Key: string;
  prompt: string;
  timestamp: Date;
}

export interface GenerateImageResponse {
  success: boolean;
  data: GeneratedImage;
}

export interface GetImagesResponse {
  success: boolean;
  data: GeneratedImage[];
  count: number;
}

/**
 * Generate an AI image from a text prompt
 * @param request - Chat ID and prompt
 * @returns Generated image data with URL
 */
export const generateImage = async (
  request: GenerateImageRequest
): Promise<GeneratedImage> => {
  const response = await axiosInstance.post<GenerateImageResponse>(
    '/gen-image',
    request
  );
  return response.data.data;
};

/**
 * Get all generated images from a specific chat
 * @param chatId - Chat session ID
 * @param limit - Maximum number of images to retrieve (default: 50)
 * @returns Array of generated images
 */
export const getChatImages = async (
  chatId: string,
  limit: number = 50
): Promise<GeneratedImage[]> => {
  const response = await axiosInstance.get<GetImagesResponse>(
    `/gen-image/chat/${chatId}`,
    {
      params: { limit }
    }
  );
  return response.data.data;
};

/**
 * Get all generated images for the authenticated user
 * @param limit - Maximum number of images to retrieve (default: 100)
 * @returns Array of generated images
 */
export const getUserImages = async (
  limit: number = 100
): Promise<GeneratedImage[]> => {
  const response = await axiosInstance.get<GetImagesResponse>(
    '/gen-image/user',
    {
      params: { limit }
    }
  );
  return response.data.data;
};

const imageGenerationService = {
  generateImage,
  getChatImages,
  getUserImages,
};

export default imageGenerationService;
