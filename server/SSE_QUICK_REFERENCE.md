# SSE Streaming API - Quick Reference Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install @google/generative-ai
```

### 2. Configure Environment
```bash
# .env file
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-pro
DEFAULT_TOKEN_LIMIT=100000
MAX_CHATS_PER_USER=5
```

### 3. Start Server
```bash
npm run dev
# Server initializes Gemini on startup
```

---

## API Endpoints

### Send Message with SSE (NEW ⭐)

**Endpoint:**
```
POST /api/chat/{chatId}/message
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "message": "Help me design an NFT collection"
}
```

**Response (Streaming):**
```
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: I'd love to help you design\n\n
data: an NFT collection!\n\n
data: {"done": true, "tokens_used": 187, "message_id": "550e8400-..."}\n\n
```

**JavaScript Client:**
```typescript
const eventSource = new EventSource(
  `/api/chat/${chatId}/message?msg=${encodeURIComponent(message)}`
);

let response = '';
eventSource.onmessage = (event) => {
  const data = event.data;
  
  if (data.startsWith('{')) {
    const meta = JSON.parse(data);
    if (meta.done) {
      console.log(`Used ${meta.tokens_used} tokens`);
      eventSource.close();
    }
  } else {
    response += data;
    updateUI(response);
  }
};
```

### Delete Chat (NEW ⭐)

**Endpoint:**
```
DELETE /api/chat/{chatId}
```

**Response:**
```json
{
  "status": "success",
  "message": "Chat deleted successfully",
  "data": {
    "chat_id": "550e8400-e29b-41d4-a716-446655440000",
    "deleted_at": "2025-11-22T10:30:45.123Z"
  }
}
```

---

## Token Calculation Explained

### Formula
```
Total Tokens = User_Message_Tokens 
             + AI_Response_Tokens 
             + System_Prompt_Tokens (150)
             + Overhead (10)
```

### Example
```
Message: "Design an NFT"
├─ User message: 3 tokens
├─ AI response: 42 tokens
├─ System prompt: 150 tokens
├─ Overhead: 10 tokens
└─ Total: 205 tokens ✅
```

### How It Works
1. **API Method (Primary)** - Uses Google's official token counter
2. **Fallback** - Character estimation if API fails
3. **Cache** - System prompt cached, reused per model
4. **Buffer** - +3% safety margin

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_MESSAGE` | 400 | Message length invalid (1-5000 chars) |
| `CHAT_NOT_FOUND` | 404 | Chat doesn't exist |
| `UNAUTHORIZED_CHAT_ACCESS` | 403 | You don't own this chat |
| `TOKEN_LIMIT_EXCEEDED` | 403 | Token budget exhausted |
| `RATE_LIMIT_ERROR` | 429 | Gemini API rate limited |
| `STREAM_ERROR` | 500 | Error during streaming |

---

## Monitoring

### Check Token Cache Stats
```bash
# Returns cache hit rate and memory usage
curl http://localhost:3000/api/chat/token-stats
```

### View User Token Usage
```bash
curl http://localhost:3000/api/user/token-usage \
  -H "Authorization: Bearer $TOKEN"
```

### Server Health
```bash
curl http://localhost:3000/health
```

---

## Common Issues

### SSE Not Streaming
✅ **Solution:** Check `X-Accel-Buffering: no` header  
✅ **Nginx:** Add `proxy_buffering off;` to config

### Tokens Way Too High
✅ **Solution:** Use API counter, not estimation  
✅ **Check:** Verify cache is working  
✅ **View:** Check logs for method used

### Stream Stops Early
✅ **Solution:** Check for errors in server logs  
✅ **Reason:** Gemini API error or timeout  
✅ **Retry:** Client should reconnect

### High Memory Usage
✅ **Solution:** Clear token cache  
✅ **Command:** Call `clearTokenCache()`  
✅ **Future:** Implement LRU eviction

---

## Files Reference

| File | Purpose |
|------|---------|
| `server/src/config/gemini.ts` | Gemini initialization |
| `server/src/utils/tokenService.ts` | Token counting logic |
| `server/src/services/chatService.ts` | `streamChatResponse()` generator |
| `server/src/controllers/chatController.ts` | `sendMessage()` endpoint |
| `server/src/routes/chat.ts` | Message routes |
| `server/src/index.ts` | Server setup with Gemini init |

---

## Performance Targets

- **Message latency:** 2-5 seconds (includes Gemini)
- **Token calculation:** <50ms
- **Concurrent streams:** 100-500 per server
- **Cache hit rate:** 70-80% typical

---

## Security Checklist

- ✅ Authentication required (JWT token)
- ✅ Authorization check (own chat only)
- ✅ Token limit enforced (before and during)
- ✅ Input validation (1-5000 chars)
- ✅ Rate limiting (via middleware)
- ✅ Gemini key in env (never exposed)
- ✅ Soft delete (audit trail preserved)

---

## Deployment Checklist

- [ ] `GEMINI_API_KEY` set in production env
- [ ] Dependencies installed: `npm install`
- [ ] Database migrations applied
- [ ] Server started: `npm run build && npm start`
- [ ] Gemini initialization logging visible
- [ ] Test SSE endpoint returns data
- [ ] Monitor token consumption

---

## Rate Limits

**Default:**
- ✅ 100 requests/min per user (global limiter)
- ✅ 5 active chats per user
- ✅ 1-5000 characters per message
- ✅ 100,000 tokens per user per month

**Adjust in `.env`:**
```bash
DEFAULT_TOKEN_LIMIT=100000      # Tokens per month
MAX_CHATS_PER_USER=5            # Active chats limit
```

---

## Testing

### Manual Test (cURL)
```bash
# Create chat first
CHAT_ID="550e8400-e29b-41d4-a716-446655440000"
TOKEN="eyJhbGc..."

# Send message with streaming
curl -X POST \
  "http://localhost:3000/api/chat/$CHAT_ID/message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Hello"}' \
  --no-buffer \
  --stream

# Expected output:
# data: I'd love to help\n
# data: {"done": true, "tokens_used": 45, ...}\n
```

### React Hook
```typescript
const { sendMessage, response, tokensUsed } = useStreamMessage();

<button onClick={() => sendMessage(chatId, message, token)}>
  Send
</button>
<div>{response}</div>
<small>Tokens: {tokensUsed}</small>
```

---

## Support Resources

- **Gemini Docs:** https://ai.google.dev/
- **SSE Spec:** https://html.spec.whatwg.org/eventsource/
- **Our Docs:** See `STREAMING_TOKEN_DOCUMENTATION.md`
- **Implementation:** See `SSE_IMPLEMENTATION_COMPLETE.md`

---

**Last Updated:** November 22, 2025  
**Status:** Production Ready ✅
