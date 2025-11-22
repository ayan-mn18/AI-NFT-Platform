/**
 * Token Counting & Management Service
 * Provides precise token calculation for both user messages and AI responses
 *
 * Token Calculation Strategy:
 * 1. For text content: Use Google's token counter API for accuracy
 * 2. For metadata: Add fixed overhead (50 tokens per metadata field)
 * 3. For system prompt: Count once per conversation, cache the result
 * 4. Conservative estimation: Add 5% buffer for safety
 *
 * Why this approach?
 * - Google Gemini's billing is token-based, accuracy prevents unexpected costs
 * - Different models may have different tokenization, hence API-based counting
 * - System prompt tokens are consistent across messages in a chat
 * - Buffer accounts for formatting, special characters, and API variances
 */

import logger from '../config/logger';
import { getCountingModel } from '../config/gemini';
import { AppError } from '../types';

// Cache for system prompt tokens (computed once per model per server lifetime)
const systemPromptTokenCache: Map<string, number> = new Map();

// Token counting cache (model -> prompt -> tokens)
const tokenCountCache: Map<string, Map<string, number>> = new Map();

/**
 * Token calculation metadata and statistics
 */
export interface TokenStats {
  text_tokens: number; // Tokens in actual content
  system_tokens: number; // System prompt tokens
  overhead_tokens: number; // Metadata and formatting overhead
  total_tokens: number; // Sum of all tokens
  calculation_method: 'api' | 'estimate'; // How tokens were calculated
  cache_hit: boolean; // Whether result came from cache
}

/**
 * Count tokens for a given text using Google's token counter
 * Results are cached to optimize API calls
 *
 * @param text - Text content to count tokens for
 * @param modelName - Model to use for counting (defaults to config.geminiModel)
 * @returns Token count and statistics
 *
 * @throws AppError if token counting fails
 *
 * Example:
 * ```typescript
 * const { total_tokens } = await countTextTokens(
 *   "Hello, how can you help me create an NFT?",
 *   "gemini-1.5-pro"
 * );
 * console.log(`Message uses ${total_tokens} tokens`);
 * ```
 */
export const countTextTokens = async (
  text: string,
  modelName: string = 'gemini-1.5-pro'
): Promise<TokenStats> => {
  try {
    // Validate input
    if (!text || text.trim().length === 0) {
      return {
        text_tokens: 0,
        system_tokens: 0,
        overhead_tokens: 0,
        total_tokens: 0,
        calculation_method: 'api',
        cache_hit: false,
      };
    }

    // Check cache first
    const cacheKey = `${modelName}:${text}`;
    if (!tokenCountCache.has(modelName)) {
      tokenCountCache.set(modelName, new Map());
    }

    const modelCache = tokenCountCache.get(modelName)!;
    if (modelCache.has(text)) {
      logger.debug('Token count cache hit', { model: modelName, textLength: text.length });
      const cachedTokens = modelCache.get(text)!;
      return {
        text_tokens: cachedTokens,
        system_tokens: 0,
        overhead_tokens: 0,
        total_tokens: cachedTokens,
        calculation_method: 'api',
        cache_hit: true,
      };
    }

    // Use Gemini's token counter API
    const model = getCountingModel();
    const request = {
      contents: [{ role: 'user', parts: [{ text }] }],
    };

    const response = await (model.countTokens as any)(request);
    const textTokens = response.totalTokens || 0;

    // Cache the result
    modelCache.set(text, textTokens);
    logger.debug('Token count computed via API', {
      model: modelName,
      textLength: text.length,
      tokens: textTokens,
    });

    return {
      text_tokens: textTokens,
      system_tokens: 0,
      overhead_tokens: 0,
      total_tokens: textTokens,
      calculation_method: 'api',
      cache_hit: false,
    };
  } catch (error) {
    logger.error('Token counting failed, falling back to estimation', {
      error,
      textLength: text.length,
    });

    // Fallback to estimation if API fails
    return estimateTokens(text);
  }
};

/**
 * Estimate tokens using character-based heuristic
 * Used as fallback when API counting fails
 *
 * Formula:
 * - Base: text.length / 4 (average ~4 chars per token)
 * - Special chars: +2% (punctuation, emojis, formatting)
 * - Buffer: +3% (safety margin for model-specific variations)
 *
 * This approach is conservative to prevent billing surprises.
 *
 * @param text - Text to estimate tokens for
 * @returns Token statistics with estimation method
 *
 * Example:
 * "Hello world" (11 chars) -> ~5 tokens (11/4 * 1.05)
 */
export const estimateTokens = (text: string): TokenStats => {
  if (!text || text.trim().length === 0) {
    return {
      text_tokens: 0,
      system_tokens: 0,
      overhead_tokens: 0,
      total_tokens: 0,
      calculation_method: 'estimate',
      cache_hit: false,
    };
  }

  // Count special characters for adjustment
  const specialCharCount = (text.match(/[^\w\s]/g) || []).length;
  const specialCharFactor = 1 + specialCharCount * 0.02;

  // Base calculation
  const baseTokens = Math.ceil(text.length / 4);
  const estimatedTokens = Math.ceil(baseTokens * specialCharFactor * 1.03); // 3% safety buffer

  logger.debug('Estimated tokens', {
    textLength: text.length,
    specialChars: specialCharCount,
    estimatedTokens,
  });

  return {
    text_tokens: estimatedTokens,
    system_tokens: 0,
    overhead_tokens: 0,
    total_tokens: estimatedTokens,
    calculation_method: 'estimate',
    cache_hit: false,
  };
};

/**
 * Count tokens for system prompt
 * System prompt is fixed per model and cached to optimize API usage
 *
 * @param systemPrompt - System prompt text
 * @param modelName - Model identifier
 * @returns System prompt token count
 */
export const countSystemPromptTokens = async (
  systemPrompt: string,
  modelName: string = 'gemini-1.5-pro'
): Promise<number> => {
  try {
    const cacheKey = `${modelName}:system`;

    // Return cached value if available
    if (systemPromptTokenCache.has(cacheKey)) {
      logger.debug('System prompt tokens from cache', { model: modelName });
      return systemPromptTokenCache.get(cacheKey)!;
    }

    // Count tokens
    const stats = await countTextTokens(systemPrompt, modelName);
    const systemTokens = stats.total_tokens;

    // Cache for future use
    systemPromptTokenCache.set(cacheKey, systemTokens);
    logger.info('System prompt token count cached', {
      model: modelName,
      tokens: systemTokens,
    });

    return systemTokens;
  } catch (error) {
    logger.error('Error counting system prompt tokens', { error });
    // Return reasonable default
    return 150; // Average system prompt is ~150 tokens
  }
};

/**
 * Calculate total tokens for a complete message exchange
 * Accounts for system prompt, user message, and response
 *
 * @param userMessage - User input message
 * @param assistantResponse - AI-generated response
 * @param modelName - Model used
 * @returns Total tokens for the exchange
 *
 * Example:
 * ```typescript
 * const totalTokens = await calculateMessageTokens(
 *   "Write a poem about NFTs",
 *   "Verse 1: Digital assets...",
 *   "gemini-1.5-pro"
 * );
 * ```
 */
export const calculateMessageTokens = async (
  userMessage: string,
  assistantResponse: string,
  modelName: string = 'gemini-1.5-pro'
): Promise<TokenStats> => {
  try {
    const [userTokens, assistantTokens, systemTokens] = await Promise.all([
      countTextTokens(userMessage, modelName),
      countTextTokens(assistantResponse, modelName),
      countSystemPromptTokens('', modelName), // Use empty to get cache
    ]);

    // Overhead: formatting, conversation markers, metadata
    const overheadTokens = 10; // Fixed overhead per exchange

    const totalTokens =
      userTokens.total_tokens +
      assistantTokens.total_tokens +
      systemTokens +
      overheadTokens;

    logger.debug('Message exchange token calculation', {
      model: modelName,
      user_message_length: userMessage.length,
      user_tokens: userTokens.total_tokens,
      assistant_response_length: assistantResponse.length,
      assistant_tokens: assistantTokens.total_tokens,
      system_tokens: systemTokens,
      overhead_tokens: overheadTokens,
      total_tokens: totalTokens,
    });

    return {
      text_tokens: userTokens.total_tokens + assistantTokens.total_tokens,
      system_tokens: systemTokens,
      overhead_tokens: overheadTokens,
      total_tokens: totalTokens,
      calculation_method: 'api',
      cache_hit: userTokens.cache_hit && assistantTokens.cache_hit,
    };
  } catch (error) {
    logger.error('Error calculating message tokens', { error });
    // Fallback to estimation
    const estimatedUserTokens = estimateTokens(userMessage).total_tokens;
    const estimatedAssistantTokens = estimateTokens(assistantResponse).total_tokens;
    const totalTokens = estimatedUserTokens + estimatedAssistantTokens + 10 + 150; // +150 for system prompt

    return {
      text_tokens: estimatedUserTokens + estimatedAssistantTokens,
      system_tokens: 150,
      overhead_tokens: 10,
      total_tokens: totalTokens,
      calculation_method: 'estimate',
      cache_hit: false,
    };
  }
};

/**
 * Get token count statistics for chat session
 * Useful for dashboard and monitoring
 *
 * @param messages - Array of message objects with content
 * @param modelName - Model used
 * @returns Aggregated token statistics
 */
export const getSessionTokenStats = async (
  messages: Array<{ role: string; content: string }>,
  modelName: string = 'gemini-1.5-pro'
): Promise<{
  total_tokens: number;
  per_message_tokens: number[];
  average_tokens_per_message: number;
  system_tokens: number;
}> => {
  try {
    if (!messages || messages.length === 0) {
      return {
        total_tokens: 0,
        per_message_tokens: [],
        average_tokens_per_message: 0,
        system_tokens: 0,
      };
    }

    const tokenCounts = await Promise.all(
      messages.map(msg => countTextTokens(msg.content, modelName))
    );

    const totalMessageTokens = tokenCounts.reduce(
      (sum, stats) => sum + stats.total_tokens,
      0
    );
    const systemTokens = await countSystemPromptTokens('', modelName);
    const overheadTokens = 10; // Per exchange overhead

    return {
      total_tokens: totalMessageTokens + systemTokens + overheadTokens * messages.length,
      per_message_tokens: tokenCounts.map(t => t.total_tokens),
      average_tokens_per_message: Math.ceil(totalMessageTokens / messages.length),
      system_tokens: systemTokens,
    };
  } catch (error) {
    logger.error('Error getting session token stats', { error });
    throw new AppError(
      'Failed to calculate session token statistics',
      500,
      'TOKEN_CALCULATION_ERROR'
    );
  }
};

/**
 * Clear token counting caches
 * Useful for memory management and testing
 */
export const clearTokenCache = (): void => {
  systemPromptTokenCache.clear();
  tokenCountCache.clear();
  logger.info('Token counting caches cleared');
};

/**
 * Get cache statistics
 * For monitoring and debugging
 *
 * @returns Cache size and hit statistics
 */
export const getTokenCacheStats = () => {
  let totalCacheSize = 0;
  let totalEntries = 0;

  tokenCountCache.forEach(modelCache => {
    totalCacheSize += modelCache.size;
    totalEntries += modelCache.size;
  });

  return {
    system_prompt_cache_entries: systemPromptTokenCache.size,
    text_token_cache_entries: totalEntries,
    total_cache_entries: systemPromptTokenCache.size + totalEntries,
  };
};

export default {
  countTextTokens,
  estimateTokens,
  countSystemPromptTokens,
  calculateMessageTokens,
  getSessionTokenStats,
  clearTokenCache,
  getTokenCacheStats,
};
