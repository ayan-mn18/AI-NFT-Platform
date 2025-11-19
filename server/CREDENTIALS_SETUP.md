# SETUP INSTRUCTIONS FOR SUPABASE CREDENTIALS

Once you have Supabase credentials from the user, follow these steps:

## Step 1: Get Supabase Credentials

From your Supabase dashboard:
1. Go to **Settings → API**
2. Copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon` key → `SUPABASE_KEY`
   - `service_role` secret → `SUPABASE_JWT_SECRET`

## Step 2: Create .env File

```bash
cd /Users/bizer/Development/Projects/AI-NFT-Platform/server
cp .env.example .env
```

## Step 3: Fill in .env with Your Credentials

Open `.env` and update:

```env
# Required: Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-here

# Required: JWT Secret (generate a strong random string, min 32 chars)
JWT_SECRET=your-super-secret-jwt-key-must-be-at-least-32-bytes-long-abc123xyz789

# Email Configuration (choose one service)
# For SendGrid:
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx

# For SMTP:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Optional: Redis (for token blacklist, caching)
REDIS_URL=redis://localhost:6379
```

## Step 4: Test Connection

```bash
npm run dev
```

Check the logs for:
```
✅ Supabase client initialized successfully
✅ Supabase connection test successful
✅ Server is running on http://localhost:3000
```

## Step 5: Create Supabase Tables

Run this SQL in Supabase SQL Editor to create the users table:

```sql
-- Create users table
CREATE TABLE public.users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_otp VARCHAR(6),
  email_otp_expires_at TIMESTAMP WITH TIME ZONE,
  
  username VARCHAR(30) UNIQUE,
  full_name VARCHAR(100),
  profile_picture_url TEXT,
  bio TEXT,
  
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('merchant', 'buyer')),
  is_active BOOLEAN DEFAULT TRUE,
  
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_username ON public.users(username);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(user_id),
  action VARCHAR(50) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
```

## Step 6: Start Implementing Endpoints

Now you're ready to implement the API endpoints. Start with:

1. **Utilities** (`src/utils/index.ts`)
   - `hashPassword` - Bcrypt hashing
   - `generateOtp` - Random OTP generation
   - `generateJwt` - JWT token creation
   - `sendEmail` - Email sending

2. **Services** (`src/services/authService.ts`)
   - Database operations for auth

3. **Controllers** (`src/controllers/authController.ts`)
   - Business logic for each endpoint

4. **Routes** (`src/routes/auth.ts`)
   - Mount endpoints

## Verification Checklist

- [ ] `.env` file created with Supabase credentials
- [ ] Server starts successfully: `npm run dev`
- [ ] Health check passes: `curl http://localhost:3000/health`
- [ ] Supabase tables created
- [ ] Ready to implement first endpoint

## Need Help?

- Check server logs: `tail -f logs/combined.log`
- Verify credentials in Supabase dashboard
- Check SUPABASE_URL format (should be https://...)
- Ensure `.env` file is NOT in git (already in .gitignore)
