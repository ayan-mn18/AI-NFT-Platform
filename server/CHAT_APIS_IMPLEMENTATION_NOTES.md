# Chat APIs - Implementation Notes & Decisions

## Overview
This document details the architectural decisions, security considerations, and design patterns used in implementing the first three chat APIs.

---

## Architectural Decisions

### 1. Service Layer Design

**Decision:** Separate business logic from HTTP handling

**Implementation:**
- `chatService.ts` contains pure business logic with no Express dependencies
- Controllers call services and format responses
- Services handle all database operations and validations

**Benefits:**
- Testable business logic independent of HTTP
- Reusable across controllers/webhooks/jobs
- Clean separation of concerns

**Example:**
```typescript
// Service handles the logic
export const createChat = async (userId: string, title?: string): Promise<Chat>

// Controller calls service and handles HTTP
export const createNewChat = async (req: AuthenticatedRequest, res: Response)
```

### 2. Error Handling Strategy

**Decision:** Centralized `AppError` class with specific error codes

**Implementation:**
```typescript
throw new AppError(
  'Maximum 5 chats allowed...',
  403,
  ChatErrorCode.MAX_CHATS_EXCEEDED
)
```

**Benefits:**
- Consistent error structure across all endpoints
- Specific error codes for frontend error handling
- Status codes follow REST conventions
- Easy to extend with new error types

---

## Security Considerations

### 1. Authentication
- ✅ All chat endpoints require JWT from cookies
- ✅ Token verified via `verifyAuth` middleware
- ✅ Email must be verified for access

### 2. Authorization
- ✅ Users can only access their own chats
- ✅ Query verification in `getChat()` prevents lateral access
- ✅ Attempted unauthorized access is logged

```typescript
if (data.user_id !== userId) {
  throw new AppError('You do not have permission...', 403, ...)
}
```

### 3. Input Validation
- ✅ Request bodies validated with Joi
- ✅ Chat IDs validated for UUID format
- ✅ Query parameters sanitized and bounded

```typescript
router.post(
  '/',
  validateRequest(
    Joi.object({
      title: Joi.string().optional().trim().min(1).max(255)
    })
  ),
  createNewChat
)
```

### 4. Resource Limits
- ✅ Maximum 5 active chats per user (database enforced)
- ✅ Pagination max 100 records to prevent data extraction
- ✅ Query parameter validation prevents negative offsets

---

## Performance Optimizations

### 1. Database Indexes
Created for common query patterns:

```sql
-- Fast user chat lookup
CREATE INDEX idx_chats_user_id ON public.chats(user_id)

-- Filtering active chats
CREATE INDEX idx_chats_user_id_is_active ON public.chats(user_id, is_active)

-- Loading message history
CREATE INDEX idx_messages_chat_id_created_at ON public.messages(chat_id, created_at)
```

### 2. Query Optimization
- Count queries use `head: true` to avoid fetching data
- Pagination range queries limit result sets
- Composite indexes for multi-column filters

### 3. Response Format
- Only essential fields returned
- Timestamps converted to ISO strings
- Metadata included for future extensibility

---

## Data Consistency

### 1. Referential Integrity
```sql
-- Foreign keys with cascade delete
user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE
chat_id UUID REFERENCES public.chats(chat_id) ON DELETE CASCADE
```

### 2. Soft Deletes
- Chats use `is_active` flag instead of hard deletion
- Preserves audit trail
- Allows future "recover deleted chat" feature

### 3. Timestamps
- All records have `created_at` and `updated_at`
- Auto-updated via database triggers
- Enables chronological ordering

---

## Logging Strategy

### Log Levels Used

**INFO:** Operation start/completion
```typescript
logger.info('Creating new chat', { userId, title })
logger.info('Chat created successfully', { chatId, userId })
```

**DEBUG:** Detailed execution info
```typescript
logger.debug('Fetching user chats', { userId, limit, offset })
logger.debug('Auth verification successful', { user_id })
```

**WARN:** Potential issues (not errors)
```typescript
logger.warn('Chat not found', { chatId, userId })
logger.warn('Unauthorized chat access attempted', { chatId, userId })
```

**ERROR:** Exceptions and failures
```typescript
logger.error('Failed to create chat', { error, userId })
```

---

## Token Management

### Token Estimation Formula
```typescript
export const estimateTokens = (content: string): number => {
  return Math.ceil((content.length / 4) * 1.3)
}
```

**Rationale:**
- Conservative estimate: ~4 characters per token
- 1.3x multiplier for safety (actual Gemini may use more)
- Prevents user from exceeding token limit unexpectedly

**Future:** Will integrate Google's official `countTokens()` API

---

## API Response Format

**Standardized Success Response:**
```json
{
  "status": "success",
  "message": "Human-readable message",
  "data": { /* response data */ }
}
```

**Standardized Error Response:**
```json
{
  "status": "error",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "field": "fieldName" // optional, for validation errors
}
```

**Benefits:**
- Consistent across all endpoints
- Frontend can rely on structure
- Easy to handle in middleware

---

## Pagination Implementation

**Query Parameters:**
```typescript
const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)
```

**Safeguards:**
- Default limit prevents fetching too much data
- Max 100 records prevents resource exhaustion
- Negative offsets clamped to 0
- Non-numeric values default to 0

**Response includes total count:**
```json
{
  "chats": [...],
  "total": 25,
  "active": 23
}
```

---

## Future-Proofing Design

### 1. Message Metadata JSONB
```typescript
metadata: Record<string, any>  // JSONB in database
```

Designed to support:
- Image attachments: `{ attachments: [{ type: 'image', url: 's3://...' }] }`
- Generation params: `{ model: 'dalle-3', prompt: '...' }`
- Processing info: `{ latency_ms: 234, tokens_used: 156 }`

### 2. Extensible Error Codes
```typescript
export enum ChatErrorCode {
  CHAT_NOT_FOUND,
  MAX_CHATS_EXCEEDED,
  TOKEN_LIMIT_EXCEEDED,
  INVALID_MESSAGE,
  CHAT_INACTIVE,
  UNAUTHORIZED_CHAT_ACCESS,
  CHAT_DELETION_FAILED,
}
```

Easy to add: `IMAGE_GENERATION_FAILED`, `UPLOAD_TOO_LARGE`, etc.

### 3. Service Methods for Reuse
```typescript
export const createChat = async (userId, title) // Used by HTTP and batch ops
export const updateChatTitle = async (chatId, userId, title) // Easily callable
export const initializeUserUsage = async (userId) // Can be called from signup flow
```

---

## Testing Approach

### Unit Test Examples

**Test: Max chat limit enforcement**
```typescript
// Create 5 chats successfully
for (let i = 0; i < 5; i++) {
  await createChat(userId, `Chat ${i}`)
}

// 6th attempt should fail
expect(createChat(userId, 'Chat 6')).toThrow(ChatErrorCode.MAX_CHATS_EXCEEDED)
```

**Test: Authorization check**
```typescript
const userId1 = 'user-1'
const userId2 = 'user-2'
const chat = await createChat(userId1, 'My Chat')

// User 2 should not access user 1's chat
expect(getChat(chat.chat_id, userId2)).toThrow(ChatErrorCode.UNAUTHORIZED_CHAT_ACCESS)
```

**Test: Input validation**
```typescript
expect(createChat(userId, '')).toThrow() // Empty title
expect(createChat(userId, 'x'.repeat(256))).toThrow() // Too long
```

---

## Configuration

### Environment Variables Required
```env
# For Gemini integration (upcoming)
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-pro

# Chat limits
DEFAULT_TOKEN_LIMIT=100000
MAX_CHATS_PER_USER=5
```

### Defaults (if not set)
```typescript
defaultTokenLimit: 100000
maxChatsPerUser: 5
```

---

## Known Limitations & Future Work

### Current Limitations
1. ❌ No real-time updates when new messages arrive (polling required)
2. ❌ No chat search functionality
3. ❌ No bulk operations (delete multiple chats)
4. ❌ Message editing/deletion not implemented

### Upcoming Features
1. ✅ Message streaming endpoint (POST /api/chat/:chatId/message)
2. ✅ Delete chat endpoint (DELETE /api/chat/:chatId)
3. ✅ Update chat title endpoint (PUT /api/chat/:chatId)
4. 📋 WebSocket support for real-time messages
5. 📋 Chat search functionality
6. 📋 Export chat history

---

## Code Quality Checklist

- [x] TypeScript strict mode
- [x] Error handling for all operations
- [x] Input validation on all endpoints
- [x] SQL injection prevention (Supabase parameterized queries)
- [x] XSS prevention (JSON responses, no inline HTML)
- [x] CSRF protection (Express built-in + SameSite cookies)
- [x] Rate limiting ready (middleware support available)
- [x] Logging at all critical points
- [x] Comments on complex logic
- [x] Consistent naming conventions
- [x] Separation of concerns
- [x] DRY principle followed

---

## Performance Metrics (Expected)

| Operation | Time | Notes |
|-----------|------|-------|
| List 20 chats | 50-100ms | Indexed query |
| Create chat | 30-50ms | Validation + insert |
| Get 50 messages | 100-200ms | Includes chat fetch |
| Check token limit | 20-40ms | Cached by session |

---

## Related Files

- **Database:** `server/database/migrations/002_create_chat_system_tables.sql`
- **Types:** `server/src/types/index.ts`
- **Configuration:** `server/src/config/env.ts`
- **Middleware:** `server/src/middleware/verifyAuth.ts`
- **Main Server:** `server/src/index.ts`

