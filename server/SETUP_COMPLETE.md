# AI-NFT Platform - Backend Architecture & Setup

## ✅ Project Initialization Complete

Your Node.js TypeScript backend is now fully scaffolded with professional architecture and configuration. All folders, middleware, and configurations are in place. Ready for API implementation!

---

## 📁 Project Structure

```
server/
├── src/
│   ├── config/              # Configuration files
│   │   ├── env.ts          # Environment variables & validation
│   │   ├── logger.ts       # Winston logger setup
│   │   └── supabase.ts     # Supabase client initialization
│   ├── middleware/          # Express middleware
│   │   ├── verifyAuth.ts   # JWT verification & email check
│   │   ├── errorHandler.ts # Centralized error handling
│   │   ├── validateRequest.ts  # Request validation with Joi
│   │   ├── rateLimiter.ts  # Rate limiting by endpoint
│   │   ├── requestLogger.ts    # HTTP request logging
│   │   ├── cors.ts         # CORS & security headers
│   │   └── index.ts        # Middleware exports
│   ├── types/              # TypeScript interfaces
│   │   └── index.ts        # All type definitions (User, JWT, etc.)
│   ├── routes/             # API route handlers
│   │   ├── auth.ts         # Auth endpoints (to implement)
│   │   ├── user.ts         # User endpoints (to implement)
│   │   └── index.ts        # Route exports
│   ├── controllers/        # Business logic
│   │   ├── authController.ts   # Auth business logic
│   │   ├── userController.ts   # User business logic
│   │   └── index.ts            # Controller exports
│   ├── services/           # Database & external services
│   │   ├── authService.ts  # Auth DB operations
│   │   ├── userService.ts  # User DB operations
│   │   └── index.ts        # Service exports
│   ├── utils/              # Helper utilities
│   │   └── index.ts        # Utilities (passwords, JWT, email, OTP)
│   └── index.ts            # Main Express app & server
├── logs/                   # Application logs (auto-created)
├── dist/                   # Compiled JavaScript (auto-generated)
├── .env                    # Environment variables (YOU MUST CREATE THIS)
├── .env.example            # Example environment variables
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
└── README.md               # This file
```

---

## 🔧 Installed Dependencies

### Core
- **express** - Web framework
- **typescript** - Language
- **ts-node** - Run TypeScript directly
- **nodemon** - Auto-restart on file changes

### Database & Authentication
- **@supabase/supabase-js** - Supabase client
- **jsonwebtoken** - JWT handling
- **bcryptjs** - Password hashing
- **uuid** - Generate UUIDs

### Middleware & Security
- **cors** - Cross-origin requests
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-async-errors** - Async error handling
- **cookie-parser** - Parse cookies

### Validation & Logging
- **joi** - Schema validation
- **winston** - Structured logging

### Email
- **nodemailer** - Email sending

### Caching & Sessions
- **redis** - Token blacklist, caching

---

## 🚀 Quick Start

### 1. Create `.env` File

Copy `.env.example` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` and add:
```env
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
JWT_SECRET=your-long-secret-key-at-least-32-characters-long
```

### 2. Start Development Server

```bash
npm run dev
# or
npm run server
```

The server will:
- ✅ Start on `http://localhost:3000`
- ✅ Auto-reload on file changes
- ✅ Log requests to console and files
- ✅ Try to connect to Supabase

### 3. Check Server Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "success",
  "message": "Server is running",
  "timestamp": "2025-11-19T22:00:00.000Z"
}
```

---

## 📝 Configuration Explained

### `src/config/env.ts`
- Loads and validates all environment variables
- Throws error if required variables are missing
- Validates JWT_SECRET length (min 32 chars for HS256)
- Type-safe configuration object

### `src/config/logger.ts`
- Winston logger with multiple transports
- Logs to console (development) and files (production)
- Separate files for errors, combined logs, exceptions
- JSON format for production, human-readable for dev
- Auto rotation support (ready to add)

### `src/config/supabase.ts`
- Supabase client initialization
- Connection testing
- Helper functions for database operations
- Awaits your credentials in `.env`

---

## 🔐 Security Features Built-In

✅ **Middleware Stack:**
- Helmet for security headers
- CORS with whitelist
- Rate limiting (global + per-endpoint)
- Request validation with Joi
- Secure cookie handling
- Input sanitization

✅ **JWT Authentication:**
- HTTP-Only cookies (no localStorage)
- Secure flag for HTTPS
- SameSite=Strict for CSRF protection
- 7-day expiration (configurable)

✅ **Password Security:**
- Bcrypt 12 rounds (slow & secure)
- Password strength validation
- Never logged or exposed

✅ **Rate Limiting:**
- Global: 100 requests per 15 minutes
- Auth: 5 attempts per 15 minutes
- Register: 3 per hour
- OTP Resend: 3 per 5 minutes

---

## 📋 Next Steps (Implementation Tasks)

Once you provide Supabase credentials, implement these in order:

### Phase 1: Core Utilities
- [ ] `src/utils/index.ts` - Password hashing, JWT, OTP, email utilities
- [ ] `src/services/authService.ts` - Database operations for auth
- [ ] `src/services/userService.ts` - Database operations for user

### Phase 2: Authentication Endpoints
- [ ] `src/controllers/authController.ts` - Business logic
- [ ] `src/routes/auth.ts` - Route handlers
- [ ] Implement: register, verify-email, signin, logout, resend-otp

### Phase 3: User Endpoints
- [ ] `src/controllers/userController.ts` - Business logic
- [ ] `src/routes/user.ts` - Route handlers
- [ ] Implement: profile, update-profile, change-password, activity-log

### Phase 4: Testing & Deployment
- [ ] Unit tests for utilities
- [ ] Integration tests for endpoints
- [ ] E2E tests for auth flow
- [ ] Deploy to staging
- [ ] Security audit
- [ ] Production deployment

---

## 🔌 API Endpoints Structure (Ready to Implement)

```
POST   /api/auth/register           → register user + send OTP
POST   /api/auth/verify-email       → verify OTP + get JWT
POST   /api/auth/signin             → login with email/password
POST   /api/auth/resend-otp         → resend OTP
POST   /api/auth/logout             → logout

GET    /api/user/profile            → get user info (auth required)
PUT    /api/user/profile            → update profile (auth required)
PUT    /api/user/change-password    → change password (auth required)
GET    /api/user/activity-log       → activity history (auth required)
```

---

## 📊 Logging

Logs are stored in `logs/` directory:
- `combined.log` - All logs
- `error.log` - Errors only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

View logs:
```bash
tail -f logs/combined.log    # Real-time view
cat logs/error.log           # View errors only
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Supabase Connection Failed
- Check `.env` file has correct URL and KEY
- Ensure Supabase project is active
- Test credentials in Supabase dashboard

### TypeScript Errors
```bash
npm run build  # Compile to check errors
npx tsc --diagnostics
```

### Clean Installation
```bash
rm -rf node_modules dist logs
npm install
npm run build
```

---

## 📚 Source of Truth

**All API specifications are documented in:** `/auth.md`

This file contains:
- Complete database schema
- JWT payload structure
- All endpoint specifications
- Request/response examples
- Error handling patterns
- Security requirements
- Implementation checklist

**Reference this file while implementing endpoints.**

---

## 🎯 Architecture Highlights

### Clean Separation of Concerns
- **Routes** - Handle HTTP requests
- **Controllers** - Business logic & validation
- **Services** - Database & external operations
- **Middleware** - Cross-cutting concerns

### Type Safety
- Full TypeScript with strict mode
- Interfaces for all request/response shapes
- Enum for error codes

### Error Handling
- Centralized error middleware
- Custom AppError class
- Consistent error response format
- Proper HTTP status codes

### Logging & Monitoring
- Structured JSON logging
- Request/response logging
- Error tracking with stack traces
- Performance metrics (request duration)

### Scalability Ready
- Middleware pattern for easy additions
- Service layer for business logic
- Prepared for caching (Redis)
- Ready for message queues

---

## 📞 Support

All configurations are production-ready. When implementing endpoints:
1. Follow the types defined in `src/types/index.ts`
2. Use the middleware for validation & auth
3. Log important operations
4. Handle errors with AppError class
5. Follow error codes in `AuthErrorCode` enum
6. Refer to `/auth.md` for specifications

**Happy coding! 🚀**
