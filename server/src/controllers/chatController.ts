/**
 * Chat Controllers
 * HTTP request handlers for chat endpoints
 *
 * Endpoints:
 * - GET /api/chat - List user's chats
 * - POST /api/chat - Create new chat
 * - GET /api/chat/:chatId - Get chat history
 */

import { Response } from 'express';
import {
  AuthenticatedRequest,
  CreateChatRequest,
  ChatListResponse,
  ChatHistoryResponse,
  AppError,
  ChatErrorCode,
} from '../types';
import logger from '../config/logger';
import {
  createChat,
  getUserChats,
  getChatMessages,
  getChat,
} from '../services/chatService';

/**
 * GET /api/chat
 * List all active chats for the authenticated user
 *
 * Query Parameters:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 *
 * Response (200 OK):
 * {
 *   status: 'success'
 *   message: 'Chats retrieved successfully'
 *   data: {
 *     chats: Chat[]
 *     total: number
 *     active: number
 *   }
 * }
 *
 * Errors:
 * - 401: Unauthorized
 * - 500: Internal server error
 */
export const listChats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logger.warn('listChats: No user in request');
      throw new AppError(
        'Unauthorized. Please sign in.',
        401,
        'UNAUTHORIZED'
      );
    }

    const userId = req.user.user_id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    logger.info('listChats endpoint called', {
      user_id: userId,
      limit,
      offset,
    });

    // Fetch chats
    const result = await getUserChats(userId, limit, offset);

    res.status(200).json({
      status: 'success',
      message: 'Chats retrieved successfully',
      data: {
        chats: result.chats,
        total: result.total,
        active: result.active,
      } as ChatListResponse,
    });

    logger.debug('listChats: Success', { user_id: userId, chats_count: result.total });
  } catch (error) {
    logger.error('listChats endpoint error', { error });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred while retrieving chats',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * POST /api/chat
 * Create a new chat session for the user
 *
 * Request body:
 * {
 *   title?: string (optional, 1-255 characters)
 * }
 *
 * Response (201 Created):
 * {
 *   status: 'success'
 *   message: 'Chat created successfully'
 *   data: {
 *     chat_id: UUID
 *     title: string
 *     created_at: ISO string
 *   }
 * }
 *
 * Errors:
 * - 401: Unauthorized
 * - 403: Max chats exceeded (max 5 per user)
 * - 400: Invalid request body
 * - 500: Internal server error
 */
export const createNewChat = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      logger.warn('createNewChat: No user in request');
      throw new AppError(
        'Unauthorized. Please sign in.',
        401,
        'UNAUTHORIZED'
      );
    }

    const userId = req.user.user_id;
    const { title } = req.body as CreateChatRequest;

    logger.info('createNewChat endpoint called', {
      user_id: userId,
      has_title: !!title,
    });

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string') {
        throw new AppError(
          'Title must be a string',
          400,
          ChatErrorCode.INVALID_MESSAGE
        );
      }

      if (title.trim().length === 0 || title.length > 255) {
        throw new AppError(
          'Title must be between 1 and 255 characters',
          400,
          ChatErrorCode.INVALID_MESSAGE
        );
      }
    }

    // Create chat
    const chat = await createChat(userId, title?.trim());

    res.status(201).json({
      status: 'success',
      message: 'Chat created successfully',
      data: {
        chat_id: chat.chat_id,
        title: chat.title,
        created_at: chat.created_at.toISOString(),
      },
    });

    logger.info('createNewChat: Success', {
      user_id: userId,
      chat_id: chat.chat_id,
    });
  } catch (error) {
    logger.error('createNewChat endpoint error', { error });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred while creating chat',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * GET /api/chat/:chatId
 * Retrieve message history for a specific chat
 *
 * URL Parameters:
 * - chatId: UUID (required)
 *
 * Query Parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 *
 * Response (200 OK):
 * {
 *   status: 'success'
 *   message: 'Chat history retrieved successfully'
 *   data: {
 *     chat_id: UUID
 *     title: string
 *     messages: Message[]
 *     total_messages: number
 *   }
 * }
 *
 * Errors:
 * - 401: Unauthorized
 * - 403: Forbidden (not chat owner)
 * - 404: Chat not found
 * - 500: Internal server error
 */
export const getChatHistory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      logger.warn('getChatHistory: No user in request');
      throw new AppError(
        'Unauthorized. Please sign in.',
        401,
        'UNAUTHORIZED'
      );
    }

    const userId = req.user.user_id;
    const { chatId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    logger.info('getChatHistory endpoint called', {
      user_id: userId,
      chat_id: chatId,
      limit,
      offset,
    });

    // Validate chatId format (basic UUID check)
    if (!isValidUUID(chatId)) {
      throw new AppError(
        'Invalid chat ID format',
        400,
        ChatErrorCode.CHAT_NOT_FOUND
      );
    }

    // Get chat (includes authorization check)
    const chat = await getChat(chatId, userId);

    // Get messages
    const { messages, total } = await getChatMessages(chatId, userId, limit, offset);

    const response: ChatHistoryResponse = {
      chat_id: chat.chat_id,
      title: chat.title,
      messages: messages.map(msg => ({
        message_id: msg.message_id,
        chat_id: msg.chat_id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
        tokens_consumed: msg.tokens_consumed,
        created_at: msg.created_at,
      })),
      total_messages: total,
    };

    res.status(200).json({
      status: 'success',
      message: 'Chat history retrieved successfully',
      data: response,
    });

    logger.debug('getChatHistory: Success', {
      user_id: userId,
      chat_id: chatId,
      messages_count: messages.length,
    });
  } catch (error) {
    logger.error('getChatHistory endpoint error', { error });

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred while retrieving chat history',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * Utility: Validate UUID format (basic check)
 * UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default {
  listChats,
  createNewChat,
  getChatHistory,
};
