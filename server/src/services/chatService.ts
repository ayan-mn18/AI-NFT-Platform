import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../config/supabase';
import logger from '../config/logger';
import {
  Chat,
  Message,
  UserUsage,
  AppError,
  ChatErrorCode,
} from '../types';
import config from '../config/env';

/**
 * Chat Service
 * Handles all chat business logic including:
 * - Chat CRUD operations
 * - Message management
 * - Token limit tracking
 * - Chat limit enforcement (max 5 per user)
 */

/**
 * Get user's total chat count
 * Includes only active chats
 */
export const getUserChatCount = async (userId: string): Promise<number> => {
  const supabase = getSupabaseClient();

  try {
    const { count, error } = await supabase
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      logger.error('Failed to get chat count', { error, userId });
      throw new AppError(
        'Failed to retrieve chat count',
        500,
        'INTERNAL_SERVER_ERROR'
      );
    }

    return count || 0;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error in getUserChatCount', { error, userId });
    throw new AppError(
      'Failed to retrieve chat count',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Create a new chat for a user
 * Enforces maximum 5 active chats per user
 */
export const createChat = async (
  userId: string,
  title?: string
): Promise<Chat> => {
  const supabase = getSupabaseClient();

  try {
    logger.info('Creating new chat', { userId, title });

    // Check chat limit
    const chatCount = await getUserChatCount(userId);
    if (chatCount >= config.maxChatsPerUser) {
      logger.warn('User exceeded max chat limit', { userId, chatCount });
      throw new AppError(
        `Maximum ${config.maxChatsPerUser} chats allowed. Please delete an old chat to create a new one.`,
        403,
        ChatErrorCode.MAX_CHATS_EXCEEDED
      );
    }

    // Generate chat ID and prepare data
    const chatId = uuidv4();
    const now = new Date().toISOString();
    const chatTitle = title || 'New Chat';

    // Insert new chat
    const { data, error } = await (supabase.from('chats') as any).insert({
      chat_id: chatId,
      user_id: userId,
      title: chatTitle,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      logger.error('Failed to create chat', { error, userId });
      throw new AppError(
        'Failed to create chat',
        500,
        'INTERNAL_SERVER_ERROR'
      );
    }

    logger.info('Chat created successfully', { chatId, userId });

    return {
      chat_id: chatId,
      user_id: userId,
      title: chatTitle,
      is_active: true,
      created_at: new Date(now),
      updated_at: new Date(now),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error in createChat', { error, userId });
    throw new AppError(
      'Failed to create chat',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Get all active chats for a user
 * Returns paginated results ordered by most recent first
 */
export const getUserChats = async (
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ chats: Chat[]; total: number; active: number }> => {
  const supabase = getSupabaseClient();

  try {
    logger.debug('Fetching user chats', { userId, limit, offset });

    // Get total count of active chats
    const { count: totalActive } = await supabase
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Fetch paginated chats
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch user chats', { error, userId });
      throw new AppError(
        'Failed to retrieve chats',
        500,
        'INTERNAL_SERVER_ERROR'
      );
    }

    const chats: Chat[] = (data || []).map((chat: any) => ({
      chat_id: chat.chat_id,
      user_id: chat.user_id,
      title: chat.title,
      is_active: chat.is_active,
      created_at: new Date(chat.created_at),
      updated_at: new Date(chat.updated_at),
    }));

    return {
      chats,
      total: chats.length,
      active: totalActive || 0,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error in getUserChats', { error, userId });
    throw new AppError(
      'Failed to retrieve chats',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Get chat by ID with authorization check
 */
export const getChat = async (
  chatId: string,
  userId: string
): Promise<Chat> => {
  const supabase = getSupabaseClient();

  try {
    logger.debug('Fetching chat', { chatId, userId });

    const { data, error } = await (supabase
      .from('chats')
      .select('*')
      .eq('chat_id', chatId)
      .single() as any);

    if (error || !data) {
      logger.warn('Chat not found', { chatId, userId });
      throw new AppError(
        'Chat not found',
        404,
        ChatErrorCode.CHAT_NOT_FOUND
      );
    }

    // Verify ownership
    if (data.user_id !== userId) {
      logger.warn('Unauthorized chat access attempted', { chatId, userId });
      throw new AppError(
        'You do not have permission to access this chat',
        403,
        ChatErrorCode.UNAUTHORIZED_CHAT_ACCESS
      );
    }

    // Check if chat is active
    if (!data.is_active) {
      logger.warn('Attempt to access inactive chat', { chatId, userId });
      throw new AppError(
        'This chat has been deleted',
        404,
        ChatErrorCode.CHAT_NOT_FOUND
      );
    }

    return {
      chat_id: data.chat_id,
      user_id: data.user_id,
      title: data.title,
      is_active: data.is_active,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error in getChat', { error, chatId, userId });
    throw new AppError(
      'Failed to retrieve chat',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Get message history for a chat
 * Includes authorization check
 */
export const getChatMessages = async (
  chatId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ messages: Message[]; total: number }> => {
  const supabase = getSupabaseClient();

  try {
    logger.debug('Fetching chat messages', { chatId, userId, limit, offset });

    // Verify chat ownership first
    await getChat(chatId, userId);

    // Get total count
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId);

    // Fetch paginated messages ordered by creation time (oldest first for context)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch messages', { error, chatId });
      throw new AppError(
        'Failed to retrieve messages',
        500,
        'INTERNAL_SERVER_ERROR'
      );
    }

    const messages: Message[] = (data || []).map((msg: any) => ({
      message_id: msg.message_id,
      chat_id: msg.chat_id,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata || {},
      tokens_consumed: msg.tokens_consumed || 0,
      created_at: new Date(msg.created_at),
    }));

    return {
      messages,
      total: totalMessages || 0,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error in getChatMessages', { error, chatId, userId });
    throw new AppError(
      'Failed to retrieve messages',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Save a message to the database
 */
export const saveMessage = async (
  chatId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  tokensConsumed: number = 0,
  metadata: Record<string, any> = {}
): Promise<Message> => {
  const supabase = getSupabaseClient();

  try {
    const messageId = uuidv4();
    const now = new Date().toISOString();

    const { data, error } = await (supabase.from('messages') as any).insert({
      message_id: messageId,
      chat_id: chatId,
      role,
      content,
      tokens_consumed: tokensConsumed,
      metadata,
      created_at: now,
    });

    if (error) {
      logger.error('Failed to save message', { error, chatId, role });
      throw new AppError(
        'Failed to save message',
        500,
        'INTERNAL_SERVER_ERROR'
      );
    }

    logger.debug('Message saved successfully', { messageId, chatId, role });

    return {
      message_id: messageId,
      chat_id: chatId,
      role,
      content,
      tokens_consumed: tokensConsumed,
      metadata,
      created_at: new Date(now),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error in saveMessage', { error, chatId });
    throw new AppError(
      'Failed to save message',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

/**
 * Check if user has reached token limit
 */
export const checkTokenLimit = async (userId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await (supabase
      .from('user_usage')
      .select('total_tokens_used, token_limit')
      .eq('user_id', userId)
      .single() as any);

    if (error) {
      // If user_usage record doesn't exist, create it
      logger.warn('User usage record not found, creating new one', { userId });
      await initializeUserUsage(userId);
      return true; // Allow if new user
    }

    return data.total_tokens_used < data.token_limit;
  } catch (error) {
    logger.error('Error checking token limit', { error, userId });
    // Default to allowing on error to not block user
    return true;
  }
};

/**
 * Initialize user usage record
 */
export const initializeUserUsage = async (userId: string): Promise<void> => {
  const supabase = getSupabaseClient();

  try {
    const now = new Date().toISOString();

    const { error } = await (supabase.from('user_usage') as any).insert({
      user_id: userId,
      total_tokens_used: 0,
      token_limit: config.defaultTokenLimit,
      last_reset_at: now,
      created_at: now,
      updated_at: now,
    });

    if (error && !error.message.includes('duplicate')) {
      logger.error('Failed to initialize user usage', { error, userId });
    }

    logger.debug('User usage initialized', { userId });
  } catch (error) {
    logger.error('Error in initializeUserUsage', { error, userId });
  }
};

/**
 * Update user's token usage
 */
export const updateUserUsage = async (
  userId: string,
  tokensConsumed: number
): Promise<void> => {
  const supabase = getSupabaseClient();

  try {
    if (!tokensConsumed || tokensConsumed <= 0) return;

    // First get current usage
    const { data: userData, error: fetchError } = await (supabase
      .from('user_usage')
      .select('total_tokens_used')
      .eq('user_id', userId)
      .single() as any);

    if (fetchError || !userData) {
      logger.error('Failed to fetch user usage', { error: fetchError, userId });
      return;
    }

    // Update with incremented value
    const newTotal = (userData.total_tokens_used || 0) + tokensConsumed;
    const { error } = await (supabase
      .from('user_usage') as any)
      .update({
        total_tokens_used: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to update user usage', { error, userId, tokensConsumed });
    }

    logger.debug('User usage updated', { userId, tokensConsumed, newTotal });
  } catch (error) {
    logger.error('Error in updateUserUsage', { error, userId });
  }
};

/**
 * Delete a chat (soft delete via is_active flag)
 */
export const deleteChat = async (
  chatId: string,
  userId: string
): Promise<void> => {
  const supabase = getSupabaseClient();

  try {
    logger.info('Deleting chat', { chatId, userId });

    // Verify ownership first
    await getChat(chatId, userId);

    // Soft delete
    const { error } = await (supabase
      .from('chats') as any)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('chat_id', chatId);

    if (error) {
      logger.error('Failed to delete chat', { error, chatId });
      throw new AppError(
        'Failed to delete chat',
        500,
        ChatErrorCode.CHAT_DELETION_FAILED
      );
    }

    logger.info('Chat deleted successfully', { chatId, userId });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error in deleteChat', { error, chatId, userId });
    throw new AppError(
      'Failed to delete chat',
      500,
      ChatErrorCode.CHAT_DELETION_FAILED
    );
  }
};

/**
 * Estimate tokens from text content
 * Conservative estimate: ~4 chars per token, with 1.3x multiplier for safety
 */
export const estimateTokens = (content: string): number => {
  return Math.ceil((content.length / 4) * 1.3);
};

/**
 * Update chat title
 */
export const updateChatTitle = async (
  chatId: string,
  userId: string,
  title: string
): Promise<void> => {
  const supabase = getSupabaseClient();

  try {
    // Verify ownership first
    await getChat(chatId, userId);

    // Validate title length
    if (!title || title.trim().length === 0 || title.length > 255) {
      throw new AppError(
        'Chat title must be between 1 and 255 characters',
        400,
        ChatErrorCode.INVALID_MESSAGE
      );
    }

    const { error } = await (supabase
      .from('chats') as any)
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('chat_id', chatId);

    if (error) {
      logger.error('Failed to update chat title', { error, chatId });
      throw new AppError(
        'Failed to update chat title',
        500,
        'INTERNAL_SERVER_ERROR'
      );
    }

    logger.debug('Chat title updated', { chatId, title });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error in updateChatTitle', { error, chatId });
    throw new AppError(
      'Failed to update chat title',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

export default {
  getUserChatCount,
  createChat,
  getUserChats,
  getChat,
  getChatMessages,
  saveMessage,
  checkTokenLimit,
  initializeUserUsage,
  updateUserUsage,
  deleteChat,
  estimateTokens,
  updateChatTitle,
};
