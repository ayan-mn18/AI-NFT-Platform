/**
 * Chat Routes
 * All chat-related endpoints
 *
 * Endpoints:
 * - GET /chat - List user's chats
 * - POST /chat - Create new chat
 * - GET /chat/:chatId - Get chat history
 */

import { Router } from 'express';
import {
  listChats,
  createNewChat,
  getChatHistory,
} from '../controllers/chatController';
import Joi from 'joi';
import { verifyAuth } from '../middleware';

const router = Router();

/**
 * GET /chat
 * List all active chats for the authenticated user
 *
 * Query Parameters:
 * - limit?: number (default: 20, max: 100)
 * - offset?: number (default: 0)
 *
 * Example: GET /api/chat?limit=10&offset=0
 */
router.get('/',listChats);

/**
 * POST /chat
 * Create a new chat session
 *
 * Request body schema: { title?: string (1-255 chars) }
 */
router.post(
  '/',
  createNewChat
);

/**
 * GET /chat/:chatId
 * Get chat history - all messages for a specific chat
 *
 * URL Parameters: chatId (UUID)
 * Query: limit (default 50), offset (default 0)
 */
router.get('/:chatId',getChatHistory);

export default router;
