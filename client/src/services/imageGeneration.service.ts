/**
 * Image Generation Service
 * Client-side service for AI image generation
 */

import axiosInstance from '../lib/axios';

// Reference image can be base64 or URL (S3 or external)
export interface ReferenceImage {
  type: 'base64' | 'url';
  data: string; // base64 data (with or without prefix) or URL
  mimeType?: string; // optional, defaults to 'image/png'
}

export interface GenerateImageRequest {
  chatId: string;
  prompt: string;
  referenceImage?: ReferenceImage;
}

export interface GeneratedImage {
  imageId: string;
  imageUrl: string;
  s3Key: string;
  prompt: string;
  referenceImageId?: string;
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
 * Convert base64 data URL to raw base64 and extract mime type
 */
const parseBase64DataUrl = (dataUrl: string): { data: string; mimeType: string } => {
  // Check if it's a data URL format: data:image/png;base64,xxxxx
  if (dataUrl.startsWith('data:')) {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      return {
        mimeType: matches[1],
        data: matches[2],
      };
    }
  }
  // If not a data URL, assume it's raw base64 PNG
  return {
    mimeType: 'image/png',
    data: dataUrl,
  };
};

/**
 * Generate an AI image from a text prompt with optional reference image
 * @param request - Chat ID, prompt, and optional reference image
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
 * Helper to create a reference image object from a base64 data URL
 */
export const createBase64Reference = (base64DataUrl: string): ReferenceImage => {
  const { data, mimeType } = parseBase64DataUrl(base64DataUrl);
  return {
    type: 'base64',
    data,
    mimeType,
  };
};

/**
 * Helper to create a reference image object from a URL (S3 or external)
 */
export const createUrlReference = (url: string): ReferenceImage => {
  return {
    type: 'url',
    data: url,
  };
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
  createBase64Reference,
  createUrlReference,
};

export { imageGenerationService };
export default imageGenerationService;
