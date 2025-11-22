# Chat System Architecture & Design

## Overview
This document outlines the architecture for a real-time, streaming chat interface powered by Gemini 3.0 Pro. The system is designed to support text-based interactions initially, with future extensibility for multi-modal capabilities (image generation/upload).

## 1. Database Schema Design

We will add three new tables to the existing PostgreSQL schema.

### 1.1. `user_usage`
Tracks token consumption and limits per user.

```sql
CREATE TABLE public.user_usage (
  user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
  total_tokens_used INTEGER DEFAULT 0,
  token_limit INTEGER DEFAULT 100000, -- Default 100k limit
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2. `chats`
Stores chat sessions. Enforces the "Max 5 chats" rule via application logic (and potentially a trigger if strict enforcement is needed at DB level).

```sql
CREATE TABLE public.chats (
  chat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  title VARCHAR(255), -- Auto-generated summary or "New Chat"
  is_active BOOLEAN DEFAULT TRUE, -- Soft delete flag
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast retrieval of user's chats
CREATE INDEX idx_chats_user_id ON public.chats(user_id);
```

### 1.3. `messages`
Stores the history of interactions. Designed to be future-proof for multi-modal content.

```sql
CREATE TABLE public.messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(chat_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  
  -- Content is stored as text for now. 
  -- For future images, we can store markdown links or use the metadata JSONB column.
  content TEXT NOT NULL,
  
  -- Future-proofing: Store image URLs, generation params, or other structured data here.
  -- Example: { "attachments": [{ "type": "image", "url": "s3://..." }] }
  metadata JSONB DEFAULT '{}'::jsonb,
  
  tokens_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for loading chat history
CREATE INDEX idx_messages_chat_id_created_at ON public.messages(chat_id, created_at);
```

## 2. API Structure

### 2.1. Dependencies
- **`@google/generative-ai`**: For interacting with Gemini 3.0 Pro.
- **`@supabase/supabase-js`**: Existing DB client.

### 2.2. Endpoints

#### `GET /api/chat`
- **Purpose**: List all active chats for the logged-in user.
- **Response**: `[{ chat_id, title, created_at, ... }]`

#### `POST /api/chat`
- **Purpose**: Start a new chat session.
- **Logic**:
  1. Count existing active chats for `user_id`.
  2. If count >= 5, return `403 Forbidden` ("Max chat limit reached. Please delete an old chat.").
  3. Create new row in `chats`.
  4. Return `chat_id`.

#### `GET /api/chat/:chatId`
- **Purpose**: Retrieve message history for a specific chat.
- **Response**: `[{ role, content, created_at, ... }]`

#### `POST /api/chat/:chatId/message`
- **Purpose**: Send a message and get a streamed response.
- **Body**: `{ "message": "Hello world" }`
- **Logic**:
  1. **Check Limits**: Query `user_usage`. If `total_tokens_used` >= `token_limit`, return `403`.
  2. **Save User Message**: Insert into `messages` (role='user').
  3. **Context Loading**: Fetch last N messages from DB to build context window.
  4. **LLM Call**: 
     - Initialize Gemini model.
     - Send history + new prompt.
     - Enable streaming.
  5. **Stream Response**:
     - Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`.
     - Pipe chunks to client.
     - Accumulate full response text in memory.
  6. **Finalize**:
     - Calculate/Estimate tokens used.
     - Insert into `messages` (role='assistant', content=full_response).
     - Update `user_usage` (increment `total_tokens_used`).

#### `DELETE /api/chat/:chatId`
- **Purpose**: Delete a chat to free up a slot.
- **Logic**: Delete from `chats` (cascade deletes messages) OR set `is_active = false`.

## 3. System Prompt Strategy

The system prompt will be injected as the first message or configured in the model initialization.

**Draft System Prompt:**
> "You are the AI Assistant for the AI-NFT Platform, a creative hub for digital artists and collectors. 
> Your goal is to assist users in generating ideas for NFT collections, refining art prompts, and understanding blockchain concepts.
> 
> Guidelines:
> 1. Be creative, concise, and helpful.
> 2. If asked about image generation, guide them on how to describe their vision (even though you cannot generate images directly yet).
> 3. Maintain a professional yet innovative tone.
> 4. Do not provide financial advice regarding crypto trading."

## 4. Future Considerations (Images)

- **Uploads**: When users upload an image for "tweaking", the file will go to S3 (via the File Upload Service). The S3 URL will be stored in `messages.metadata`.
- **Vision API**: We will pass this S3 URL (or base64 data) to Gemini Pro Vision capabilities.
- **Generation**: If the user asks to *generate* an image, the backend will call an image gen API (e.g., DALL-E 3 or Stable Diffusion), store the result in S3, and save the URL in `messages.metadata` with `role='assistant'`.

## 5. Implementation Checklist

1. [ ] Run SQL migrations to create tables.
2. [ ] Install `@google/generative-ai`.
3. [ ] Create `ChatService` class.
4. [ ] Create `ChatController` with streaming logic.
5. [ ] Add routes to `server/src/routes/chat.ts`.
