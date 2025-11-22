# Chat APIs - Quick Reference

## Installation & Setup

### 1. Install Dependency
```bash
cd server
npm install @google/generative-ai
```

### 2. Run Migration
Go to Supabase SQL Editor and run:
```sql
-- Copy from: server/database/migrations/002_create_chat_system_tables.sql
```

### 3. Update .env
```env
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-pro
DEFAULT_TOKEN_LIMIT=100000
MAX_CHATS_PER_USER=5
```

### 4. Start Server
```bash
npm run dev
```

---

## API Quick Reference

### List Chats
```
GET /api/chat?limit=20&offset=0
Authorization: Required (JWT)

Response:
{
  "status": "success",
  "data": {
    "chats": [...],
    "total": 5,
    "active": 5
  }
}
```

### Create Chat
```
POST /api/chat
Authorization: Required (JWT)
Body: { "title": "My Chat" }

Response (201):
{
  "status": "success",
  "data": {
    "chat_id": "uuid",
    "title": "My Chat",
    "created_at": "2025-11-22T..."
  }
}
```

### Get Chat History
```
GET /api/chat/{chatId}?limit=50&offset=0
Authorization: Required (JWT)

Response:
{
  "status": "success",
  "data": {
    "chat_id": "uuid",
    "title": "My Chat",
    "messages": [...],
    "total_messages": 2
  }
}
```

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| UNAUTHORIZED | 401 | Not logged in |
| MAX_CHATS_EXCEEDED | 403 | Already have 5 chats |
| UNAUTHORIZED_CHAT_ACCESS | 403 | Not your chat |
| CHAT_NOT_FOUND | 404 | Chat doesn't exist |
| INVALID_MESSAGE | 400 | Bad input |
| INTERNAL_SERVER_ERROR | 500 | Server error |

---

## Response Format

**Success:**
```json
{
  "status": "success",
  "message": "Operation successful",
  "data": { /* result */ }
}
```

**Error:**
```json
{
  "status": "error",
  "message": "What went wrong",
  "code": "ERROR_CODE"
}
```

---

## Service Methods Available

```typescript
import { chatService } from './services'

// List
chatService.getUserChats(userId, limit, offset)
chatService.getChatMessages(chatId, userId, limit, offset)

// Create
chatService.createChat(userId, title)

// Read
chatService.getChat(chatId, userId)
chatService.getUserChatCount(userId)

// Token Management
chatService.checkTokenLimit(userId)
chatService.updateUserUsage(userId, tokensConsumed)
chatService.initializeUserUsage(userId)
chatService.estimateTokens(content)

// Modify
chatService.updateChatTitle(chatId, userId, newTitle)
chatService.saveMessage(chatId, role, content, tokens, metadata)
chatService.deleteChat(chatId, userId)
```

---

## Database Schema

### chats
```sql
chat_id (UUID, PK)
user_id (UUID, FK)
title (VARCHAR 255)
is_active (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### messages
```sql
message_id (UUID, PK)
chat_id (UUID, FK)
role ('user' | 'assistant' | 'system')
content (TEXT)
metadata (JSONB)
tokens_consumed (INTEGER)
created_at (TIMESTAMP)
```

### user_usage
```sql
user_id (UUID, PK)
total_tokens_used (INTEGER)
token_limit (INTEGER)
last_reset_at (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

---

## Files Changed

```
✅ Created:
   server/src/services/chatService.ts
   server/src/controllers/chatController.ts
   server/src/routes/chat.ts

✅ Modified:
   server/src/types/index.ts
   server/src/config/env.ts
   server/src/routes/index.ts
   server/src/services/index.ts
   server/src/index.ts
```

---

## Testing with cURL

### Get Token (login first)
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt
```

### List Chats
```bash
curl http://localhost:3000/api/chat \
  -b cookies.txt
```

### Create Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
```

### Get History
```bash
curl http://localhost:3000/api/chat/550e8400-e29b-41d4-a716-446655440000 \
  -b cookies.txt
```

---

## Limits & Defaults

| Setting | Default | Max | Min |
|---------|---------|-----|-----|
| Chats per user | - | 5 | 1 |
| Chat title length | - | 255 | 1 |
| Pagination limit | 20/50 | 100 | 1 |
| Message history limit | 50 | 100 | 1 |
| Token limit per user | 100000 | ∞ | 0 |

---

## Validation Rules

### Chat Title
- Type: String
- Required: No (auto-generates if omitted)
- Length: 1-255 characters
- Processing: Trimmed of whitespace

### Query Parameters
- limit: Integer, 1-100
- offset: Integer, 0+

### Chat ID
- Format: UUID v4
- Required: Yes
- Example: `550e8400-e29b-41d4-a716-446655440000`

---

## Common Error Scenarios

### "Maximum 5 chats allowed"
User has reached chat limit.
**Solution:** Delete an old chat first

### "Unauthorized. Please sign in"
No valid auth token.
**Solution:** Login to get JWT token

### "You do not have permission"
Accessing another user's chat.
**Solution:** Use correct chat_id from your chats

### "Chat not found"
Invalid chat_id or deleted chat.
**Solution:** Verify chat_id format and existence

### "Title must be between 1 and 255"
Invalid title length.
**Solution:** Use 1-255 character title

---

## Performance Tips

1. **Limit pagination to 20-50** for better response times
2. **Cache chat list** on frontend with periodic refresh
3. **Preload message history** for active chat
4. **Batch operations** when possible
5. **Use offset pagination** only (not cursor for now)

---

## Architecture Overview

```
Route (chat.ts)
  ↓
Controller (chatController.ts)
  ├─ Validation
  ├─ Authorization
  └─ Response formatting
  ↓
Service (chatService.ts)
  ├─ Business logic
  ├─ Database operations
  └─ Error handling
  ↓
Database (Supabase/PostgreSQL)
  └─ chats, messages, user_usage tables
```

---

## What's Next

1. **Message Streaming** - POST /api/chat/:chatId/message with SSE
2. **Delete Chat** - DELETE /api/chat/:chatId
3. **Update Title** - PUT /api/chat/:chatId
4. **Gemini Integration** - Actual AI responses
5. **Frontend UI** - React chat interface

---

## Documentation Links

- Full API Reference: `CHAT_APIS_DOCUMENTATION.md`
- Implementation Details: `CHAT_APIS_IMPLEMENTATION_NOTES.md`
- System Design: `CHAT_SYSTEM_DESIGN.md`
- Migration Guide: `CHAT_MIGRATION_GUIDE.md`

---

**Status: ✅ Ready for testing**
