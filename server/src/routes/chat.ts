/**
 * Chat Routes
 * All chat-related endpoints with SSE streaming support
 *
 * Endpoints:
 * - GET /chat - List user's chats
 * - POST /chat - Create new chat
 * - GET /chat/:chatId - Get chat history
 * - POST /chat/:chatId/message - Send message with SSE streaming
 * - DELETE /chat/:chatId - Delete chat
 */

import { Router } from 'express';
import {
  listChats,
  createNewChat,
  getChatHistory,
  sendMessage,
  deleteChatHandler,
} from '../controllers/chatController';

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
router.get('/', listChats);

/**
 * POST /chat
 * Create a new chat session
 *
 * Request body:
 * {
 *   title?: string (optional, 1-255 characters)
 * }
 *
 * Example:
 * POST /api/chat
 * { "title": "My NFT Ideas" }
 */
router.post(
  '/',
  createNewChat
);

/**
 * GET /chat/:chatId
 * Get chat history - all messages for a specific chat
 *
 * URL Parameters:
 * - chatId: UUID (required)
 *
 * Query Parameters:
 * - limit?: number (default: 50, max: 100)
 * - offset?: number (default: 0)
 *
 * Example: GET /api/chat/{chatId}?limit=50&offset=0
 */
router.get(
  '/:chatId',
  getChatHistory
);

/**
 * POST /chat/:chatId/message
 * Send a message to a chat with SSE streaming response
 *
 * URL Parameters:
 * - chatId: UUID (required)
 *
 * Request body:
 * {
 *   message: string (required, 1-5000 characters)
 * }
 *
 * Response:
 * - Content-Type: text/event-stream
 * - Streams chunks of the AI response as they arrive
 * - Final event contains tokens_used and message_id
 *
 * Example:
 * POST /api/chat/{chatId}/message
 * { "message": "Help me create an NFT concept for a digital painter" }
 *
 * Response (streaming):
 * data: I'd love to help you create an NFT concept!
 * data: Let's start by exploring your artistic style...
 * data: {"done": true, "tokens_used": 245, "message_id": "uuid"}
 */
router.post(
  '/:chatId/message',
  sendMessage
);

/**
 * DELETE /chat/:chatId
 * Delete (soft delete) a chat session
 * Marks chat as inactive instead of permanently deleting
 *
 * URL Parameters:
 * - chatId: UUID (required)
 *
 * Response:
 * {
 *   status: 'success'
 *   message: 'Chat deleted successfully'
 *   data: {
 *     chat_id: UUID
 *     deleted_at: ISO timestamp
 *   }
 * }
 *
 * Example:
 * DELETE /api/chat/{chatId}
 */
router.delete(
  '/:chatId',
  deleteChatHandler
);

export default router;
