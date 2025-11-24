/**
 * Image Generation Routes
 * Endpoints for AI-powered image generation
 * 
 * Endpoints:
 * - POST /gen-image - Generate image from prompt
 * - GET /gen-image/chat/:chatId - Get images from specific chat
 * - GET /gen-image/user - Get all user's generated images
 */

import { Router } from 'express';
import {
  generateImage,
  getImagesFromChat,
  getUserGeneratedImages,
} from '../controllers/imageController';

const router = Router();

/**
 * POST /api/gen-image
 * Generate an AI image from a text prompt
 * 
 * Request body:
 * {
 *   chatId: string;
 *   prompt: string;
 * }
 * 
 * Example:
 * POST /api/gen-image
 * {
 *   "chatId": "550e8400-e29b-41d4-a716-446655440000",
 *   "prompt": "A futuristic cyberpunk cityscape at night with neon lights"
 * }
 */
router.post('/', generateImage);

/**
 * GET /api/gen-image/chat/:chatId
 * Get all generated images from a specific chat
 * 
 * Query Parameters:
 * - limit?: number (default: 50, max: 100)
 * 
 * Example: GET /api/gen-image/chat/550e8400-e29b-41d4-a716-446655440000?limit=20
 */
router.get('/chat/:chatId', getImagesFromChat);

/**
 * GET /api/gen-image/user
 * Get all generated images for the authenticated user
 * 
 * Query Parameters:
 * - limit?: number (default: 100, max: 200)
 * 
 * Example: GET /api/gen-image/user?limit=50
 */
router.get('/user', getUserGeneratedImages);

export default router;
