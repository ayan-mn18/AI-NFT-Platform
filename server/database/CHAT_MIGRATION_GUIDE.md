# Chat System SQL Setup - Quick Reference

## How to Apply Migrations

You have two options:

### Option 1: Use Individual Migration File (Recommended for Future Proofing)
1. Go to your Supabase SQL Editor
2. Click "New Query"
3. Copy the entire contents from: `server/database/migrations/002_create_chat_system_tables.sql`
4. Paste it into the SQL Editor
5. Click "Run" or press Cmd+Enter
6. Verify all tables are created (check verification queries section)

### Option 2: Use Combined init.sql (Full Schema Reset)
1. Go to your Supabase SQL Editor
2. Click "New Query"
3. Copy the entire contents from: `server/database/init.sql`
4. Paste it into the SQL Editor
5. Click "Run" or press Cmd+Enter
6. This will recreate ALL tables including users and chat system

---

## Tables Created

### 1. `user_usage`
Tracks token consumption per user
```sql
Columns:
- user_id (UUID, PK) → references users.user_id
- total_tokens_used (INTEGER, default: 0)
- token_limit (INTEGER, default: 100000)
- last_reset_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP) - auto-updated via trigger
```

### 2. `chats`
Chat sessions (enforces 5 chat limit in application)
```sql
Columns:
- chat_id (UUID, PK)
- user_id (UUID, FK) → references users.user_id
- title (VARCHAR, default: 'New Chat')
- is_active (BOOLEAN, default: true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP) - auto-updated via trigger
```

### 3. `messages`
Message history with multi-modal support
```sql
Columns:
- message_id (UUID, PK)
- chat_id (UUID, FK) → references chats.chat_id
- role (VARCHAR) - CHECK (role IN ('user', 'assistant', 'system'))
- content (TEXT)
- metadata (JSONB, default: '{}')
- tokens_consumed (INTEGER, default: 0)
- created_at (TIMESTAMP)
```

---

## Indexes Created

All tables have optimized indexes for:
- User lookups (userId filters)
- Active/inactive filtering
- Chronological sorting
- JSONB metadata searches (for future image queries)

---

## Key Features

✅ **Automatic Timestamps**: All tables have `updated_at` that auto-updates via triggers
✅ **Referential Integrity**: Foreign keys cascade on delete
✅ **Future-Proof**: JSONB `metadata` column ready for image attachments
✅ **Soft Delete**: `is_active` flag on chats for audit trail
✅ **Performance**: Multiple indexes for fast queries

---

## Verification Queries (Copy & Paste)

Run these to verify migration succeeded:

```sql
-- Check all 3 tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('user_usage', 'chats', 'messages')
ORDER BY table_name;

-- View all indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename IN ('user_usage', 'chats', 'messages');

-- Count records (should be 0 for new tables)
SELECT 'user_usage' as table_name, COUNT(*) as row_count FROM public.user_usage
UNION ALL
SELECT 'chats', COUNT(*) FROM public.chats
UNION ALL
SELECT 'messages', COUNT(*) FROM public.messages;
```

---

## Next Steps After SQL Migration

1. **Environment Variables** - Add to `.env`:
   ```
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-pro
   DEFAULT_TOKEN_LIMIT=100000
   MAX_CHATS_PER_USER=5
   ```

2. **Install Package**:
   ```bash
   npm install @google/generative-ai
   ```

3. **Create Backend Files**:
   - `server/src/config/gemini.ts` - Gemini initialization
   - `server/src/services/chatService.ts` - Chat business logic
   - `server/src/controllers/chatController.ts` - HTTP handlers
   - `server/src/routes/chat.ts` - Route definitions

4. **Update Existing Files**:
   - `server/src/config/env.ts` - Add Gemini config variables
   - `server/src/types/index.ts` - Add Chat/Message/UserUsage interfaces
   - `server/src/services/index.ts` - Export chatService
   - `server/src/routes/index.ts` - Export chatRoutes
   - `server/src/index.ts` - Register chat routes

---

## Row Level Security (Optional)

The migration includes RLS policy definitions (commented out). If you want to enable multi-tenant safety:

1. Find the RLS section in the migration
2. Uncomment the policies
3. Run again

This ensures users can only:
- View their own user_usage
- View/modify their own chats
- View/add messages only to their chats

---

## Common Issues & Solutions

**Error: "chat_id" references "chats" which doesn't exist**
→ Run the migration first before testing inserts

**Error: "Trigger already exists"**
→ The migration has `DROP TRIGGER IF EXISTS` - this is normal

**Tables not appearing in Supabase UI**
→ Refresh the browser or click the refresh button in Supabase

**Foreign key constraint failed**
→ Make sure user_id exists in users table before inserting chat/usage records
