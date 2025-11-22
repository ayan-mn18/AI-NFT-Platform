-- ============================================
-- CHAT SYSTEM MIGRATIONS
-- ============================================
-- 
-- Creates tables for chat interface functionality:
-- - user_usage: Tracks token consumption per user
-- - chats: Chat sessions (max 5 per user)
-- - messages: Message history with multi-modal support
-- 
-- Run this migration after the main init.sql
-- ============================================

-- ============================================
-- USER_USAGE TABLE
-- ============================================
-- 
-- Tracks token consumption and limits per user
-- Allows for per-user token limits and monitoring
-- 

CREATE TABLE IF NOT EXISTS public.user_usage (
  user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
  total_tokens_used INTEGER DEFAULT 0,
  token_limit INTEGER DEFAULT 100000,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON public.user_usage(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_usage_update_timestamp ON public.user_usage;
CREATE TRIGGER trigger_user_usage_update_timestamp
BEFORE UPDATE ON public.user_usage
FOR EACH ROW
EXECUTE FUNCTION update_user_usage_updated_at();


-- ============================================
-- CHATS TABLE
-- ============================================
-- 
-- Stores chat sessions
-- Each user can have up to 5 active chats
-- Soft delete via is_active flag for audit trail
-- 

CREATE TABLE IF NOT EXISTS public.chats (
  chat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'New Chat',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast retrieval of user's chats
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);

-- Index for filtering active chats
CREATE INDEX IF NOT EXISTS idx_chats_user_id_is_active ON public.chats(user_id, is_active);

-- Index for sorting by creation
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chats_update_timestamp ON public.chats;
CREATE TRIGGER trigger_chats_update_timestamp
BEFORE UPDATE ON public.chats
FOR EACH ROW
EXECUTE FUNCTION update_chats_updated_at();


-- ============================================
-- MESSAGES TABLE
-- ============================================
-- 
-- Stores message history for each chat
-- Designed to support future multi-modal content (images)
-- 
-- Columns:
-- - metadata: JSONB for storing image URLs, generation params, etc.
--   Example: { "attachments": [{ "type": "image", "url": "s3://...", "generated": true }] }
-- 

CREATE TABLE IF NOT EXISTS public.messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(chat_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  tokens_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for loading chat history efficiently
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON public.messages(chat_id, created_at ASC);

-- Index for searching within a chat
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);

-- Index for role-based filtering
CREATE INDEX IF NOT EXISTS idx_messages_role ON public.messages(role);

-- GIN index for JSONB metadata (if querying attachments becomes frequent)
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin ON public.messages USING GIN(metadata);


-- ============================================
-- ROW LEVEL SECURITY (Optional but Recommended)
-- ============================================
-- 
-- Uncomment to enable RLS for multi-tenant safety
-- This ensures users can only access their own data
--

/*
-- Enable RLS on user_usage table
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON public.user_usage
  FOR SELECT
  USING (user_id = (SELECT user_id FROM public.users WHERE email = current_user LIMIT 1));

CREATE POLICY "Only system can update user_usage"
  ON public.user_usage
  FOR UPDATE
  USING (FALSE);

-- Enable RLS on chats table
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats"
  ON public.chats
  FOR SELECT
  USING (user_id = (SELECT user_id FROM public.users WHERE email = current_user LIMIT 1));

CREATE POLICY "Users can create chats"
  ON public.chats
  FOR INSERT
  WITH CHECK (user_id = (SELECT user_id FROM public.users WHERE email = current_user LIMIT 1));

CREATE POLICY "Users can update their own chats"
  ON public.chats
  FOR UPDATE
  USING (user_id = (SELECT user_id FROM public.users WHERE email = current_user LIMIT 1))
  WITH CHECK (user_id = (SELECT user_id FROM public.users WHERE email = current_user LIMIT 1));

CREATE POLICY "Users can delete their own chats"
  ON public.chats
  FOR DELETE
  USING (user_id = (SELECT user_id FROM public.users WHERE email = current_user LIMIT 1));

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their chats"
  ON public.messages
  FOR SELECT
  USING (
    chat_id IN (
      SELECT chat_id FROM public.chats 
      WHERE user_id = (SELECT user_id FROM public.users WHERE email = current_user LIMIT 1)
    )
  );

CREATE POLICY "Users can insert messages to their chats"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    chat_id IN (
      SELECT chat_id FROM public.chats 
      WHERE user_id = (SELECT user_id FROM public.users WHERE email = current_user LIMIT 1)
    )
  );
*/


-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- 
-- Run these to verify the migration was successful:
--

/*
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('user_usage', 'chats', 'messages')
ORDER BY table_name;

-- View user_usage structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_usage'
ORDER BY ordinal_position;

-- View chats structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'chats'
ORDER BY ordinal_position;

-- View messages structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'messages'
ORDER BY ordinal_position;

-- View all indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename IN ('user_usage', 'chats', 'messages');
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- 
-- The chat system tables have been successfully created!
-- 
-- Next Steps:
-- 1. Install @google/generative-ai: npm install @google/generative-ai
-- 2. Add environment variables:
--    GEMINI_API_KEY=your_api_key
--    GEMINI_MODEL=gemini-pro
--    DEFAULT_TOKEN_LIMIT=100000
--    MAX_CHATS_PER_USER=5
-- 
-- 3. Create services (chatService.ts)
-- 4. Create controllers (chatController.ts)
-- 5. Create routes (chat.ts)
-- 
-- ============================================
