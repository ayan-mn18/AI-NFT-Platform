# Database Setup Guide

This directory contains SQL scripts for initializing the AI-NFT Platform database.

## Quick Start

### 1. Prerequisites
- Supabase account and project created
- Supabase project URL and anon key ready

### 2. Initialize the Database

#### Option A: Using Supabase Web Interface (Recommended for beginners)

1. **Log into Supabase**
   - Go to [supabase.com](https://supabase.com)
   - Click on your AI-NFT Platform project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "+ New Query"

3. **Run the initialization script**
   - Open `init.sql` from this directory
   - Copy the entire contents
   - Paste into the SQL Editor in Supabase
   - Click "Run" (or press Cmd+Enter / Ctrl+Enter)

4. **Verify the setup**
   - You should see success messages
   - Go to "Table Editor" to verify the `users` table exists
   - Check the table has all expected columns

#### Option B: Using Command Line (Advanced)

If you have psql installed:

```bash
# Connect to your Supabase database
psql -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres < init.sql

# When prompted, enter your Supabase password
```

#### Option C: Using Supabase CLI

```bash
# Push migrations to your project
supabase db push

# View schema
supabase db pull
```

## Database Schema

### Users Table

The main users table stores all account information:

```sql
users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  email_verified BOOLEAN,
  email_verification_otp VARCHAR(6),
  email_otp_expires_at TIMESTAMP,
  username VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  profile_picture_url TEXT,
  bio TEXT (max 500 chars),
  user_type VARCHAR(50) ('merchant' | 'buyer'),
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_login_at TIMESTAMP,
  failed_login_attempts INTEGER,
  account_locked_until TIMESTAMP
)
```

### Indexes

Optimized indexes for common queries:
- `email` - Authentication lookups
- `email_verification_otp` - OTP verification
- `user_type` - Marketplace filtering
- `is_active` - Active user queries
- `username` - Profile page lookups
- `created_at` - Sorting and pagination

### Triggers

- `update_users_updated_at` - Automatically updates the `updated_at` field on modifications

## Optional Features

The `init.sql` file includes commented-out sections for advanced features:

### Activity Logs Table

Uncomment the "ACTIVITY_LOGS TABLE" section to enable audit trail tracking:

```sql
-- Track user actions (login, purchase, nft_generation, etc.)
-- Includes IP address and user agent for security
```

### Row Level Security (RLS)

Uncomment the "ROW LEVEL SECURITY" section to enable policy-based access control:

```sql
-- Ensures users can only see/modify their own data
-- Essential for multi-tenant SaaS applications
```

## Verification

After running the init script, verify the setup:

```sql
-- Check if users table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'users';

-- View table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'users';
```

Or use the Supabase web interface:
1. Go to "Table Editor"
2. Click on the `users` table
3. Verify all columns are present
4. Check the "Indexes" tab to see all indexes

## Next Steps

1. **Update Environment Variables**
   ```bash
   # In server/.env
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_KEY=YOUR_ANON_KEY
   ```

2. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Test the Register Endpoint**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "password": "SecurePass123!",
       "user_type": "merchant",
       "full_name": "John Doe"
     }'
   ```

## Troubleshooting

### "users" table already exists

If you get an error that the table already exists:
- The `init.sql` uses `IF NOT EXISTS` to prevent errors
- You can safely run it multiple times
- Indexes and triggers will be recreated if they don't exist

### Permission denied errors

If you get permission errors:
1. Verify you're using the correct Supabase project
2. Check that your user role has sufficient privileges
3. Contact Supabase support if issues persist

### Can't connect to database

If the database connection fails:
1. Verify your `SUPABASE_URL` and `SUPABASE_KEY` are correct
2. Check that your IP address is whitelisted in Supabase
3. Ensure your project is not paused (free tier projects pause after inactivity)

## Resetting the Database

To start fresh and remove all data:

```sql
-- Drop all tables and reset
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;

-- Then run init.sql again
```

⚠️ **WARNING**: This will delete all user data. Only use in development!

## Database Backups

Supabase automatically backs up your database. To access backups:

1. Go to your Supabase project dashboard
2. Click "Settings" → "Backups"
3. View and restore from available backup points

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [AI-NFT Platform Setup Guide](../README.md)
