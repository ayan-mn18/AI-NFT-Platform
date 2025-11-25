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
 * Image with full metadata
 */
export interface ImageWithMetadata {
  imageId: string;
  imageUrl: string;
  s3Key: string;
  prompt: string;
  timestamp: string; // ISO string
}

/**
 * Image data grouped by date with full metadata
 */
export interface ImagesByDate {
  [date: string]: ImageWithMetadata[]; // Date as key (DD/MM/YYYY), array of images with metadata
}

export interface GetUserImagesResponse {
  success: boolean;
  data: ImagesByDate;
  totalImages: number;
}

/**
 * Get all generated images for the authenticated user grouped by date
 * @param limit - Maximum number of images to retrieve (default: 500)
 * @returns Object with dates as keys and array of images with metadata as values
 * 
 * Response format:
 * {
 *   "25/11/2025": [
 *     { imageId, imageUrl, s3Key, prompt, timestamp },
 *     ...
 *   ],
 *   "22/11/2025": [...]
 * }
 */
export const getUserImages = async (
  limit: number = 500
): Promise<{ data: ImagesByDate; totalImages: number }> => {
  const response = await axiosInstance.get<GetUserImagesResponse>(
    '/gen-image/user',
    {
      params: { limit }
    }
  );
  return {
    data: response.data.data,
    totalImages: response.data.totalImages,
  };
};

export interface GetImageHistoryResponse {
  success: boolean;
  data: Array<{ date: string; images: ImageWithMetadata[] }>;
  totalDates: number;
  totalImages: number;
}

/**
 * Image history item (array format)
 */
export interface ImageHistoryItem {
  date: string;
  images: ImageWithMetadata[];
}

/**
 * Get all generated images for the authenticated user grouped by date (array format)
 * @param limit - Maximum number of images to retrieve (default: 500)
 * @returns Array of images grouped by date, sorted by date descending
 * 
 * Response format:
 * [
 *   { date: "25/11/2025", images: [{ imageId, imageUrl, ... }] },
 *   { date: "22/11/2025", images: [...] }
 * ]
 */
export const getUserImageHistory = async (
  limit: number = 500
): Promise<ImageHistoryItem[]> => {
  const response = await axiosInstance.get<GetImageHistoryResponse>(
    '/gen-image/user/history',
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
  getUserImageHistory,
  createBase64Reference,
  createUrlReference,
};

export { imageGenerationService };
export default imageGenerationService;
