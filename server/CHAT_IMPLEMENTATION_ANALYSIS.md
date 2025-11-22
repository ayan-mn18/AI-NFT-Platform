# Chat System Implementation Analysis

## Current State vs. Design Requirements

### ✅ What's Already in Place
1. **Database Foundation**: PostgreSQL with Supabase integration
2. **Authentication System**: JWT-based auth, user verification, OTP system
3. **File Upload Infrastructure**: S3 integration for file storage with proper S3 key organization
4. **Express Server Setup**: Middleware chain (auth, CORS, rate limiting, logging)
5. **Configuration Management**: Environment variables properly structured
6. **Service Architecture**: Separation of concerns (services, controllers, routes)

---

## Required Changes & Additions

### 1. **Database Migrations**
**File**: `server/database/migrations/002_create_chat_system_tables.sql`

Add three new tables to support the chat system:
- `user_usage` - Token consumption tracking
- `chats` - Chat session management
- `messages` - Message history with multi-modal support

**Note**: These should reference `public.users(user_id)` to align with existing auth system.

---

### 2. **Environment Configuration**
**File**: `server/src/config/env.ts`

**Add new variables**:
```typescript
// Gemini API
geminiApiKey: string;
geminiModel: string; // 'gemini-pro' or versioned model

// Chat Limits
defaultTokenLimit: number; // Default: 100000
maxChatsPerUser: number; // Default: 5
```

---

### 3. **TypeScript Types**
**File**: `server/src/types/index.ts`

**Add interfaces**:
```typescript
// Chat-related types
interface Chat {
  chat_id: string;
  user_id: string;
  title: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Message {
  message_id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any>;
  tokens_consumed: number;
  created_at: Date;
}

interface UserUsage {
  user_id: string;
  total_tokens_used: number;
  token_limit: number;
  last_reset_at: Date;
  updated_at: Date;
}

// API Request/Response types
interface SendMessageRequest {
  message: string;
  attachments?: {
    type: 'image';
    url: string; // S3 URL
  }[];
}

interface ChatListResponse {
  chats: Chat[];
  total: number;
}

interface MessageHistoryResponse {
  chat_id: string;
  messages: Message[];
}
```

---

### 4. **Chat Service**
**New File**: `server/src/services/chatService.ts`

**Core Methods**:
- `createChat(userId: string): Promise<Chat>`
- `getUserChats(userId: string): Promise<Chat[]>`
- `getChatMessages(chatId: string): Promise<Message[]>`
- `deleteChat(chatId: string): Promise<void>`
- `checkTokenLimit(userId: string): Promise<boolean>`
- `streamResponse(chatId: string, userId: string, message: string): AsyncGenerator`
- `saveMessage(chatId: string, role: string, content: string, metadata?: any): Promise<Message>`
- `updateUserUsage(userId: string, tokensConsumed: number): Promise<void>`

---

### 5. **Chat Controller**
**New File**: `server/src/controllers/chatController.ts`

**Endpoints Handler Methods**:
- `listChats(req, res)` - GET /api/chat
- `createChat(req, res)` - POST /api/chat
- `getChat(req, res)` - GET /api/chat/:chatId
- `sendMessage(req, res)` - POST /api/chat/:chatId/message
- `deleteChat(req, res)` - DELETE /api/chat/:chatId

**Key Implementation Notes**:
- `sendMessage` must set SSE headers: `Content-Type: text/event-stream`
- Stream chunks as `data: <chunk>\n\n` format
- Accumulate full response before final DB save

---

### 6. **Routes**
**New File**: `server/src/routes/chat.ts`

**Route Structure**:
```
GET    /api/chat                    - List all user chats
POST   /api/chat                    - Create new chat
GET    /api/chat/:chatId            - Get chat history
POST   /api/chat/:chatId/message    - Send message (SSE streaming)
DELETE /api/chat/:chatId            - Delete chat
```

All endpoints require `verifyAuth` middleware.

---

### 7. **Gemini Integration**
**New File**: `server/src/config/gemini.ts`

**Exports**:
- `initializeGemini()` - Set up Gemini client with API key
- `getGeminiClient()` - Get initialized client instance
- `SYSTEM_PROMPT` - Global system prompt constant

**System Prompt**:
```
"You are the AI Assistant for the AI-NFT Platform, a creative hub for digital 
artists and collectors. Your goal is to assist users in generating ideas for 
NFT collections, refining art prompts, and understanding blockchain concepts.

Guidelines:
1. Be creative, concise, and helpful.
2. If asked about image generation, guide users on how to describe their vision 
   (future capability).
3. Maintain a professional yet innovative tone.
4. Do not provide financial advice regarding crypto trading.
5. Support future multi-modal interactions (images will be analyzed/generated)."
```

---

### 8. **Package Dependencies**
**Update**: `server/package.json`

**Add**:
```json
{
  "@google/generative-ai": "^0.3.0"
}
```

**Installation**:
```bash
npm install @google/generative-ai
```

---

### 9. **Index File Updates**
**File**: `server/src/routes/index.ts`

**Add export**:
```typescript
export { default as chatRoutes } from './chat';
```

**File**: `server/src/services/index.ts`

**Add export**:
```typescript
export { default as chatService } from './chatService';
```

---

### 10. **Server Registration**
**File**: `server/src/index.ts`

**In Route Registration Section, add**:
```typescript
import { chatRoutes } from './routes';

// After other routes
app.use('/api/chat', verifyAuth, chatRoutes);
```

---

## Implementation Priority

### Phase 1 (Critical Path)
1. Create migration file with chat tables
2. Add Gemini config and initialize client
3. Create ChatService with token limit & chat limit logic
4. Create ChatController with SSE streaming endpoint

### Phase 2 (Integration)
1. Create ChatRoutes
2. Update route exports
3. Register routes in main server file
4. Test all endpoints

### Phase 3 (Frontend Integration)
1. Create chat UI components
2. Implement SSE client-side streaming
3. Wire up to backend endpoints

---

## Key Design Decisions

### SSE (Server-Sent Events) vs WebSocket
- **Choice**: SSE for streaming responses
- **Reason**: Simpler to implement, one-way streaming sufficient for now, easier to integrate with existing HTTP auth middleware

### Token Estimation
- **Approach**: Use approximate token counting based on character length
- **Formula**: `tokens ≈ (characters / 4) * 1.3` (conservative estimate)
- **Future**: Integrate Google's actual token counting API

### Message Metadata JSONB
- **Future Image Support**: Store image references with generation params or S3 URLs
- **Example**:
  ```json
  {
    "attachments": [
      {
        "type": "image",
        "url": "s3://bucket/image.png",
        "generated": true,
        "model": "dalle-3"
      }
    ]
  }
  ```

### Chat Limit Enforcement
- **Location**: Application layer (not DB trigger)
- **Check**: Count active chats before creation
- **Error**: 403 Forbidden with descriptive message

---

## Testing Checklist

- [ ] Migration runs without errors
- [ ] Chat creation respects 5-chat limit
- [ ] Token limit blocks new messages when exceeded
- [ ] SSE streaming returns chunks with proper formatting
- [ ] Message history loads with correct ordering
- [ ] Chat deletion cascades correctly
- [ ] Timestamps are stored and retrieved correctly
- [ ] Unauthorized users cannot access other users' chats

---

## Security Considerations

1. **Row-Level Security**: Consider enabling RLS on chat tables
2. **Rate Limiting**: Apply per-user rate limits on `/api/chat/:chatId/message`
3. **Input Validation**: Validate message length, chat existence
4. **Token Limit Enforcement**: Check before each request, not after streaming completes
5. **API Key**: Store Gemini API key in environment, never expose to client
