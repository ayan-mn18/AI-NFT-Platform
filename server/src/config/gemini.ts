/**
 * Google Generative AI (Gemini) Configuration
 * Manages Gemini client initialization, model setup, and system prompts
 *
 * Features:
 * - Lazy initialization of Gemini client
 * - Centralized system prompt management
 * - Token counting capability
 * - Error handling for API key validation
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import logger from './logger';
import config from './env';

let genAI: GoogleGenerativeAI | null = null;

/**
 * AI-NFT Platform System Prompt
 * Guides Gemini's responses for NFT/Art domain
 */
export const SYSTEM_PROMPT = `You are the AI Assistant for the AI-NFT Platform, a creative hub for digital artists and collectors specializing in NFT generation and blockchain integration.

Your role is to:
1. Help users generate creative NFT ideas and concepts
2. Refine and improve art prompts for image generation
3. Explain blockchain and NFT concepts in accessible terms
4. Suggest composition, style, and theme improvements
5. Provide inspiration for digital art collections

Guidelines:
- Be creative, concise, and enthusiastic about digital art
- Provide actionable suggestions for artwork improvement
- Explain technical concepts in simple terms
- If discussing image generation, guide users on effective prompting techniques
- Maintain a professional yet innovative tone
- Support future multi-modal interactions (image analysis and generation)
- Do not provide financial or investment advice
- Focus on creative and technical aspects of NFT creation

When responding:
- Keep responses focused and relevant
- Use examples when explaining concepts
- Suggest next steps or follow-up questions
- Maintain context across multi-turn conversations
- Acknowledge limitations of current capabilities`;

/**
 * Safety settings for Gemini API
 * Configured for general-purpose creative use
 */
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Initialize Google Generative AI client
 * Called once on server startup
 *
 * @throws Error if API key is not configured
 */
export const initializeGemini = (): void => {
  try {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    logger.info('Google Generative AI initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Google Generative AI', { error });
    throw error;
  }
};

/**
 * Get initialized Gemini client
 * Ensures client is initialized before use
 *
 * @returns GoogleGenerativeAI instance
 * @throws Error if client is not initialized
 */
export const getGeminiClient = (): GoogleGenerativeAI => {
  if (!genAI) {
    throw new Error(
      'Gemini client not initialized. Call initializeGemini() first.'
    );
  }
  return genAI;
};

/**
 * Get generative model instance
 * Handles model selection and configuration
 *
 * @param modelName - Model identifier (e.g., 'gemini-1.5-pro')
 * @returns Generative model instance
 */
export const getGenerativeModel = (modelName: string = config.geminiModel) => {
  const client = getGeminiClient();
  return client.getGenerativeModel({
    model: modelName,
    safetySettings: SAFETY_SETTINGS,
    systemInstruction: SYSTEM_PROMPT,
  });
};

/**
 * Get model for token counting
 * Can be different from generation model for optimization
 *
 * @returns Generative model for counting tokens
 */
export const getCountingModel = () => {
  return getGenerativeModel(config.geminiModel);
};

/**
 * Get supported generative model names
 * Used for validation and fallback logic
 *
 * @returns Array of model names
 */
export const getSupportedModels = (): string[] => [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-pro-exp-02-05', // Latest preview model
  'gemini-pro',
];

/**
 * Check if model is supported
 *
 * @param modelName - Model to validate
 * @returns true if model is supported
 */
export const isSupportedModel = (modelName: string): boolean => {
  return getSupportedModels().includes(modelName);
};

/**
 * Get model display name
 * User-friendly model name for logs and responses
 *
 * @param modelName - Internal model name
 * @returns User-friendly name
 */
export const getModelDisplayName = (modelName: string): string => {
  const names: Record<string, string> = {
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemini-2.0-pro-exp-02-05': 'Gemini 2.0 Pro (Experimental)',
    'gemini-pro': 'Gemini Pro',
  };
  return names[modelName] || modelName;
};

export default {
  initializeGemini,
  getGeminiClient,
  getGenerativeModel,
  getCountingModel,
  getSupportedModels,
  isSupportedModel,
  getModelDisplayName,
  SYSTEM_PROMPT,
  SAFETY_SETTINGS,
};
