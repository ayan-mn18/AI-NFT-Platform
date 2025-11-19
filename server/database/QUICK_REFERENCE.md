# Database Setup - Quick Reference

## TL;DR - 3 Steps

### Step 1: Run SQL Script
1. Go to Supabase → SQL Editor → New Query
2. Copy-paste `init.sql` contents
3. Click Run

### Step 2: Configure Environment
```bash
# Edit server/.env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=YOUR_ANON_KEY
```

### Step 3: Verify & Start
```bash
cd server
npm install
npm run dev
```

## SQL Script Commands

### Run in Supabase SQL Editor
```bash
# Copy entire contents of init.sql and paste into SQL Editor
# Then click Run
```

### Users Table Schema
```sql
users (
  user_id UUID (PK),
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  email_verified BOOLEAN,
  email_verification_otp VARCHAR(6),
  email_otp_expires_at TIMESTAMP,
  username VARCHAR UNIQUE,
  full_name VARCHAR,
  profile_picture_url TEXT,
  bio TEXT,
  user_type VARCHAR ('merchant'|'buyer'),
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP (auto),
  last_login_at TIMESTAMP,
  failed_login_attempts INTEGER,
  account_locked_until TIMESTAMP
)
```

## Verification Commands

```sql
-- Check table exists
SELECT * FROM public.users LIMIT 1;

-- View schema
\d public.users

-- Count users
SELECT COUNT(*) FROM public.users;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'users';
```

## Test Register Endpoint

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "user_type": "merchant",
    "full_name": "Test User"
  }'
```

Expected response (201 Created):
```json
{
  "status": "success",
  "message": "Registration successful. Check your email for OTP verification.",
  "data": {
    "user_id": "uuid-value",
    "email": "test@example.com",
    "user_type": "merchant",
    "email_verified": false,
    "created_at": "2025-11-19T10:00:00Z"
  }
}
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Table already exists | Normal - script uses IF NOT EXISTS |
| Permission denied | Check Supabase credentials & IP whitelist |
| Connection timeout | Verify SUPABASE_URL & SUPABASE_KEY in .env |
| "users" table not visible | Refresh page or check schema name is "public" |

## Environment Setup

Create `server/.env`:
```env
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=YOUR_ANON_KEY

# JWT
JWT_SECRET=your-secret-key-min-32-characters

# Server
PORT=3000
NODE_ENV=development

# Email (SendGrid or SMTP)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-key
# OR
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

## Files in This Directory

- **init.sql** - Main database initialization script
- **README.md** - Comprehensive setup guide
- **QUICK_REFERENCE.md** - This file

## Next Endpoints to Implement

After register works:
1. ✅ POST /auth/register
2. ⏳ POST /auth/verify-email (verify OTP)
3. ⏳ POST /auth/signin (login)
4. ⏳ POST /auth/resend-otp
5. ⏳ POST /auth/logout
6. ⏳ GET /api/user/profile
7. ⏳ PUT /api/user/profile
