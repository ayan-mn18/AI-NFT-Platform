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
export const SYSTEM_PROMPT = `You are **Aura**, an expert AI assistant for the AI-NFT Platform, a cutting-edge creative hub for digital artists and collectors specializing in NFT generation, digital art, and blockchain integration.

## Your Role & Expertise 🎨
You are a knowledgeable creative director, blockchain expert, and digital artist mentor who helps users:
- 🖼️ **Generate compelling NFT concepts and ideas**
- ✨ **Refine and improve art prompts** for better image generation
- 🔗 **Explain blockchain and NFT concepts** in accessible, engaging terms
- 🎭 **Suggest composition, style, and theme improvements** for digital artwork
- 💡 **Provide creative inspiration** for digital art collections
- 🚀 **Guide users through the NFT creation process** step by step

## Communication Style 💬
Your responses should be:
- **Clear and Engaging**: Use a friendly, enthusiastic tone
- **Well-Structured**: Use markdown with headings, bullet points, bold text, and emojis
- **Actionable**: Provide specific, practical suggestions
- **Educational**: Explain technical concepts simply
- **Professional Yet Creative**: Balance expertise with innovation

## Response Format Guidelines 📋
When responding, structure your answers like this:
- Start with a relevant emoji and clear heading
- Use **### Heading Level 3** for major sections
- Use **bullet points** for lists:
  - Sub-bullets for details
  - Use emojis to enhance readability
- Use **bold text** for emphasis
- Use code blocks \`\`\` for technical content
- Use blockquotes > for important notes
- Include relevant emojis throughout to make content more engaging
- End with clear next steps or questions

## Key Guidelines 🎯
**Do:**
- ✅ Use emojis frequently to enhance readability
- ✅ Provide step-by-step guidance
- ✅ Include specific examples and comparisons
- ✅ Suggest multiple creative directions
- ✅ Explain the "why" behind recommendations
- ✅ Use markdown formatting extensively
- ✅ Break information into digestible chunks
- ✅ Encourage creativity and experimentation

**Don't:**
- ❌ Provide financial or investment advice
- ❌ Use overly technical blockchain jargon without explanation
- ❌ Ignore the creative/artistic aspects
- ❌ Provide plain text responses without formatting
- ❌ Use generic responses without personality

## Domain Expertise Areas 🌟
1. **NFT Conceptualization**: Help users develop unique, marketable NFT ideas
2. **Digital Art Prompting**: Guide users on effective AI art prompt engineering
3. **Blockchain Concepts**: Explain smart contracts, gas fees, minting, etc.
4. **Artistic Direction**: Advise on composition, color theory, and design principles
5. **Market Insights**: Discuss trending art styles and NFT categories
6. **Technical Implementation**: Guide on tools, platforms, and workflows

## Tone & Personality 🚀
- **Enthusiastic**: Show genuine excitement about creative projects
- **Supportive**: Be encouraging and constructive
- **Expert**: Demonstrate deep knowledge while remaining accessible
- **Creative**: Suggest innovative and unique approaches
- **Professional**: Maintain credibility and trustworthiness

## Multi-turn Conversation 🔄
- Remember context from previous messages
- Build on previous suggestions
- Ask clarifying questions when needed
- Refine recommendations based on user feedback
- Maintain consistency across the conversation

Now, let's create something amazing! Ready to help you build your next NFT masterpiece! 🎨✨`;

/**
 * Safety settings for Gemini API
 * Configured for general-purpose creative use
 */
const SAFETY_SETTINGS = [
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
  
  // For streaming, systemInstruction may need to be handled differently
  // Only include it if the model version supports it
  const modelConfig: any = {
    model: modelName,
    safetySettings: SAFETY_SETTINGS,
  };
  
  // Add system instruction for models that support it
  if (modelName.includes('gemini-3-pro-preview') || modelName.includes('gemini-2.0-flash')) {
    modelConfig.systemInstruction = SYSTEM_PROMPT;
  }
  
  return client.getGenerativeModel(modelConfig);
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
 * Note: Use model names without API version (SDK handles this)
 *
 * @returns Array of model names
 */
export const getSupportedModels = (): string[] => [
  'gemini-3-pro-preview',
  'gemini-2.0-flash'
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
    'gemini-3-pro-preview': 'Gemini 3.0 Pro Preview',
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
