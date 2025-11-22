# Chat APIs Implementation

## Overview
Implemented three core chat endpoints following enterprise-grade backend patterns. All endpoints are **protected with JWT authentication** and follow the existing codebase architecture.

---

## Implemented Endpoints

### 1. **GET /api/chat** - List User's Chats
Lists all active chats for the authenticated user with pagination support.

**Authentication:** Required (JWT)

**Query Parameters:**
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | number | 20 | 100 | Number of chats to return |
| `offset` | number | 0 | - | Number of chats to skip |

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/chat?limit=10&offset=0" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Chats retrieved successfully",
  "data": {
    "chats": [
      {
        "chat_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "NFT Collection Ideas",
        "is_active": true,
        "created_at": "2025-11-22T10:30:00Z",
        "updated_at": "2025-11-22T10:30:00Z"
      }
    ],
    "total": 1,
    "active": 1
  }
}
```

**Error Responses:**

*401 Unauthorized - Missing/Invalid Auth*
```json
{
  "status": "error",
  "message": "Unauthorized. Please sign in.",
  "code": "UNAUTHORIZED"
}
```

*500 Internal Server Error*
```json
{
  "status": "error",
  "message": "An unexpected error occurred while retrieving chats",
  "code": "INTERNAL_SERVER_ERROR"
}
```

---

### 2. **POST /api/chat** - Create New Chat
Creates a new chat session for the user. User can have maximum 5 active chats.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "title": "NFT Collection Ideas"  // Optional, 1-255 characters
}
```

**Validation Rules:**
- `title` (optional): String, 1-255 characters, trimmed of whitespace

**cURL Example:**
```bash
curl -X POST "http://localhost:3000/api/chat" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "NFT Collection Ideas"
  }'
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Chat created successfully",
  "data": {
    "chat_id": "550e8400-e29b-41d4-a716-446655440002",
    "title": "NFT Collection Ideas",
    "created_at": "2025-11-22T10:35:00Z"
  }
}
```

**Error Responses:**

*403 Forbidden - Max Chats Exceeded*
```json
{
  "status": "error",
  "message": "Maximum 5 chats allowed. Please delete an old chat to create a new one.",
  "code": "MAX_CHATS_EXCEEDED"
}
```

*400 Bad Request - Invalid Title*
```json
{
  "status": "error",
  "message": "Title must be between 1 and 255 characters",
  "code": "INVALID_MESSAGE"
}
```

---

### 3. **GET /api/chat/:chatId** - Get Chat History
Retrieves all messages for a specific chat with pagination.

**Authentication:** Required (JWT)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chatId` | UUID | Yes | Chat ID in UUID format |

**Query Parameters:**
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| `limit` | number | 50 | 100 |
| `offset` | number | 0 | - |

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/chat/550e8400-e29b-41d4-a716-446655440000?limit=20&offset=0" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Chat history retrieved successfully",
  "data": {
    "chat_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "NFT Collection Ideas",
    "messages": [
      {
        "message_id": "550e8400-e29b-41d4-a716-446655440003",
        "chat_id": "550e8400-e29b-41d4-a716-446655440000",
        "role": "user",
        "content": "How do I create an NFT?",
        "metadata": {},
        "tokens_consumed": 12,
        "created_at": "2025-11-22T10:31:00Z"
      },
      {
        "message_id": "550e8400-e29b-41d4-a716-446655440004",
        "chat_id": "550e8400-e29b-41d4-a716-446655440000",
        "role": "assistant",
        "content": "Creating an NFT involves...",
        "metadata": {},
        "tokens_consumed": 156,
        "created_at": "2025-11-22T10:31:05Z"
      }
    ],
    "total_messages": 2
  }
}
```

**Error Responses:**

*404 Not Found - Chat Doesn't Exist*
```json
{
  "status": "error",
  "message": "Chat not found",
  "code": "CHAT_NOT_FOUND"
}
```

*403 Forbidden - Unauthorized Access*
```json
{
  "status": "error",
  "message": "You do not have permission to access this chat",
  "code": "UNAUTHORIZED_CHAT_ACCESS"
}
```

*400 Bad Request - Invalid Chat ID Format*
```json
{
  "status": "error",
  "message": "Invalid chat ID format",
  "code": "CHAT_NOT_FOUND"
}
```

---

## Architecture & Code Quality Decisions

### 1. **Security**
- ✅ **JWT Authentication**: All endpoints protected with `verifyAuth` middleware
- ✅ **Authorization Checks**: Users can only access their own chats
- ✅ **Input Validation**: Request bodies validated with Joi schemas
- ✅ **UUID Format Validation**: Chat IDs validated before DB queries
- ✅ **Pagination Limits**: Max 100 records to prevent data dumps

### 2. **Error Handling**
- ✅ **Consistent Error Format**: All errors follow standardized structure with status codes and error codes
- ✅ **Meaningful Error Codes**: Specific enum codes for different error types (`CHAT_NOT_FOUND`, `MAX_CHATS_EXCEEDED`, etc.)
- ✅ **Appropriate HTTP Status Codes**: 
  - 201 for resource creation
  - 403 for permission denied
  - 404 for not found
  - 400 for validation errors

### 3. **Database Design**
- ✅ **Referential Integrity**: Foreign keys with CASCADE delete
- ✅ **Soft Deletes**: `is_active` flag preserves audit trail
- ✅ **Indexes**: Optimized queries with proper indexes on:
  - `user_id` (for listing user chats)
  - `user_id + is_active` (composite for active chats)
  - `chat_id + created_at` (for message history)

### 4. **Logging**
- ✅ **Comprehensive Logging**: Info, debug, and error logs at key points
- ✅ **Contextual Information**: User IDs, chat IDs, and operation details logged
- ✅ **Performance Monitoring**: Debug logs for pagination parameters

### 5. **Code Structure**
Following the existing codebase patterns:
- ✅ **Service Layer**: Business logic in `chatService.ts`
- ✅ **Controller Layer**: HTTP handling in `chatController.ts`
- ✅ **Route Layer**: Endpoint definitions with validation in `chat.ts`
- ✅ **Type Safety**: Full TypeScript interfaces for all DTOs
- ✅ **Configuration Management**: Environment variables in `env.ts`

### 6. **Data Validation**
- ✅ **Request Validation**: Joi schemas for request bodies
- ✅ **Query Parameter Limits**: Max values enforced programmatically
- ✅ **String Trimming**: Titles automatically trimmed
- ✅ **Type Checking**: TypeScript interfaces ensure type safety

### 7. **Performance**
- ✅ **Pagination**: Default 20-50 records, max 100 to prevent resource exhaustion
- ✅ **Efficient Queries**: Uses count for total and separate paginated fetch
- ✅ **Database Indexes**: Query patterns optimized with appropriate indexes
- ✅ **Connection Pooling**: Leverages Supabase connection pooling

---

## Integration Checklist

- [x] Chat types added to `src/types/index.ts`
- [x] Environment variables added to `src/config/env.ts`
- [x] Chat service created (`src/services/chatService.ts`)
- [x] Chat controller created (`src/controllers/chatController.ts`)
- [x] Chat routes created (`src/routes/chat.ts`)
- [x] Routes exported in `src/routes/index.ts`
- [x] Services exported in `src/services/index.ts`
- [x] Chat routes registered in main `src/index.ts`

---

## Testing the APIs

### 1. Start the Server
```bash
npm run dev
```

### 2. Get Auth Token
First, register and sign in to get a JWT token (or use existing token from cookies).

### 3. Test List Chats
```bash
curl -X GET "http://localhost:3000/api/chat" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

### 4. Test Create Chat
```bash
curl -X POST "http://localhost:3000/api/chat" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Chat"}'
```

### 5. Test Get History
```bash
curl -X GET "http://localhost:3000/api/chat/CHAT_ID_FROM_STEP_4" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

---

## Future Enhancements

These three APIs are the foundation. Upcoming endpoints:
1. **POST /api/chat/:chatId/message** - Send message with streaming response
2. **DELETE /api/chat/:chatId** - Delete/archive a chat
3. **PUT /api/chat/:chatId** - Update chat title
4. **POST /api/chat/:chatId/share** - Share chat with other users (optional)

---

## Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Modified | Added chat-related interfaces |
| `src/config/env.ts` | Modified | Added Gemini config variables |
| `src/services/chatService.ts` | Created | Business logic for chats |
| `src/controllers/chatController.ts` | Created | HTTP request handlers |
| `src/routes/chat.ts` | Created | Route definitions |
| `src/routes/index.ts` | Modified | Export chatRoutes |
| `src/services/index.ts` | Modified | Export chatService |
| `src/index.ts` | Modified | Register chat routes |

---

## Database Dependencies

Requires these tables (from migration):
- `public.users` - Existing user table
- `public.chats` - New chat sessions table
- `public.messages` - New messages table
- `public.user_usage` - Token tracking table

Run migration: `server/database/migrations/002_create_chat_system_tables.sql`
