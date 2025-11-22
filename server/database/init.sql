/**
 * ============================================
 * AI-NFT PLATFORM - DATABASE INITIALIZATION
 * ============================================
 * 
 * This SQL script creates the initial schema for the AI-NFT Platform.
 * 
 * INSTRUCTIONS:
 * 1. Log into your Supabase project
 * 2. Go to SQL Editor
 * 3. Click "New Query"
 * 4. Copy and paste the entire contents of this file
 * 5. Click "Run" or press Cmd+Enter
 * 6. Verify all tables are created successfully
 * 
 * ============================================
 */

-- ============================================
-- CREATE EXTENSIONS (if not already enabled)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================
-- USERS TABLE
-- ============================================
-- 
-- Core user account table for authentication and profile management
-- 
-- Key features:
-- - UUID primary key for distributed systems
-- - Email uniqueness constraint
-- - Password hash storage (never plain text)
-- - OTP verification system for email confirmation
-- - Account status tracking and security features
-- - Timestamps for audit trail
--

CREATE TABLE IF NOT EXISTS public.users (
  -- Primary Identifiers
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,

  -- Authentication
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_otp VARCHAR(6),
  email_otp_expires_at TIMESTAMP WITH TIME ZONE,

  -- User Profile
  username VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  profile_picture_url TEXT,
  bio TEXT,

  -- Validation: bio max 500 characters
  CONSTRAINT bio_max_length CHECK (LENGTH(bio) <= 500),

  -- User Type & Permissions
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('merchant', 'buyer')),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Security & Sessions
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP WITH TIME ZONE
);


-- ============================================
-- INDEXES
-- ============================================
-- 
-- Optimizes query performance for frequently searched columns
--

-- Email lookup (used in auth checks)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Email verification lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_otp ON public.users(email_verification_otp);

-- User type filtering (for marketplace queries)
CREATE INDEX IF NOT EXISTS idx_users_user_type ON public.users(user_type);

-- Active users filtering
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Username lookup (profile pages)
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Created at (for sorting/pagination)
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);


-- ============================================
-- TRIGGERS
-- ============================================
-- 
-- Automatically update the updated_at timestamp on record modifications
--

-- Create or replace the update_timestamp function
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF NOT EXISTS trigger_users_update_timestamp ON public.users;
CREATE TRIGGER trigger_users_update_timestamp
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();


-- ============================================
-- ACTIVITY_LOGS TABLE (Planned)
-- ============================================
-- 
-- Tracks user actions for audit trail and analytics
-- Uncomment when ready to implement
--

/*
CREATE TABLE IF NOT EXISTS public.activity_logs (
  activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
*/


-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- ============================================
-- 
-- Uncomment to enable RLS for multi-tenant safety
-- This ensures users can only see/modify their own data
--

/*
-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = user_id::uuid);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = user_id::uuid);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity logs
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (auth.uid() = user_id::uuid);
*/


-- ============================================
-- VERIFICATION
-- ============================================
-- 
-- Run these queries to verify the schema was created successfully:
--

/*
-- Check if users table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'users';

-- View users table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- View indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'users';

-- View constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_schema = 'public' AND table_name = 'users';
*/


-- ============================================
-- CHAT SYSTEM TABLES
-- ============================================
-- 
-- Creates tables for chat interface functionality:
-- - user_usage: Tracks token consumption per user
-- - chats: Chat sessions (max 5 per user)
-- - messages: Message history with multi-modal support
-- 

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
-- COMPLETED
-- ============================================
-- 
-- The database schema has been successfully initialized!
-- 
-- Next steps:
-- 1. Update your .env file with Supabase credentials:
--    SUPABASE_URL=your_project_url
--    SUPABASE_KEY=your_project_key
-- 
-- 2. Add chat system environment variables:
--    GEMINI_API_KEY=your_api_key
--    GEMINI_MODEL=gemini-pro
--    DEFAULT_TOKEN_LIMIT=100000
--    MAX_CHATS_PER_USER=5
-- 
-- 3. Run: npm install
-- 
-- 4. Start the server: npm run dev
-- 
-- 5. Test the register endpoint:
--    POST http://localhost:3000/api/auth/register
--    Content-Type: application/json
--    
--    {
--      "email": "user@example.com",
--      "password": "SecurePass123!",
--      "user_type": "merchant",
--      "full_name": "John Doe"
--    }
--
-- ============================================
