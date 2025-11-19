# AI-NFT Platform - Authentication & User API DocumentationUser Schema:



## 📋 Table of Contentsuser_id (uuidv4)

1. [Database Schema](#database-schema)username 

2. [Authentication Architecture](#authentication-architecture)password (hashed by crypto or bcrypt)

3. [Auth Endpoints](#auth-endpoints)email

4. [User Endpoints](#user-endpoints)email_verified (boolean)

5. [Error Handling](#error-handling)email_verifier (OTP number 4 digits)

6. [Security Considerations](#security-considerations)timestamps



---

Auth Apis:

## 🗄️ Database Schema

POST /auth/register:

### Users Collection/Table-> { email, password }



```typescript-> Create User in DB & send email with OTP (set the OTP to the user schema in db) for verification. no other APi will be accessible without the email verification. There will be middleware called verify Auth which will take care of JWT verification & seeing if email is verified or no 

interface User {

  // Primary IdentifiersPOST /auth/verify-email

  user_id: string;                    // UUID v4, Primary Key-> { email }

  email: string;                      // Unique, Indexed

  -> Verify OTP, and remove the ORP from the user schema. Set verified and send the cookie to the browser in the response tokens as setCookie called auth_token

  // Authentication

  password_hash: string;              // Bcrypt hashed (12 rounds), never store plain textPOST /auth/signin

  email_verified: boolean;            // Default: false-> { email, password }

  email_verification_otp: string | null; // 6-digit OTP, expires in 10 minutes

  email_otp_expires_at: Date | null;  // Expiration timestamp for OTP-> Verify email & password are correct & send the Cookie as setCookie

  

  // User ProfilePOST /auth/logout

  username: string | null;            // Unique, Optional initially-> { email }

  full_name: string | null;           // Optional

  profile_picture_url: string | null; // Optional-> send the setCookie to null here in the response

  bio: string | null;                 // Optional, max 500 chars

  User APIs:

  // User Type & Permissions

  user_type: 'merchant' | 'buyer';    // Role for the platformPUT /user/update-info

  is_active: boolean;                 // Default: true (soft delete via false)can send these details to be updated, whichever details will be present will be updated { username }

  

  // TimestampsThe core auth logic will be with JWT auth token which will be sent through cookies only, auth_token in Cookies. This JWt will only contain { email, timestamps (of login time)}
  created_at: Date;                   // ISO 8601 format
  updated_at: Date;                   // ISO 8601 format
  last_login_at: Date | null;         // Tracks last successful login
  
  // Security & Sessions
  failed_login_attempts: number;      // Default: 0, reset on successful login
  account_locked_until: Date | null;  // Lock account after 5 failed attempts
}
```

### JWT Token Payload

```typescript
interface JWTPayload {
  email: string;              // Unique identifier
  user_id: string;            // UUID reference
  user_type: 'merchant' | 'buyer';
  email_verified: boolean;    // Check if verified before accessing protected routes
  iat: number;                // Issued At timestamp (Unix)
  exp: number;                // Expiration timestamp (Unix) - 7 days
}
```

---

## 🔐 Authentication Architecture

### Authentication Flow

```
1. User Registers → Receives OTP via Email
2. User Verifies Email with OTP → JWT Token created & stored in HTTP-Only Cookie
3. User Logs In → Email/Password verified → New JWT Token & Session updated
4. Protected Routes → Middleware validates JWT from Cookie
5. User Logs Out → Clear JWT Cookie
```

### Middleware: `verifyAuth`

```typescript
/**
 * Middleware to validate JWT and check email verification status
 * 
 * - Extracts JWT from HTTP-Only cookie (auth_token)
 * - Validates JWT signature and expiration
 * - Checks if user's email is verified
 * - Attaches user payload to request object
 * 
 * On Failure:
 * - 401 Unauthorized: No token or invalid token
 * - 403 Forbidden: Email not verified
 * 
 * On Success:
 * - Attaches req.user with JWT payload
 */
```

### Security Features

- **Password Hashing**: Bcrypt with 12 salt rounds
- **OTP Security**: 6-digit random, 10-minute expiration, sent via email only
- **JWT Storage**: HTTP-Only, Secure (HTTPS), SameSite=Strict cookies
- **Rate Limiting**: Max 5 failed login attempts → 15-minute account lock
- **Email Validation**: RFC 5322 compliant regex
- **CORS**: Only allow requests from trusted frontend domains

---

## 🔌 Auth Endpoints

### 1. POST `/auth/register`

**Purpose**: Create a new user account and send OTP verification email

**Request Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "merchant@example.com",
  "password": "SecurePassword123!",
  "user_type": "merchant",
  "full_name": "John Doe"
}
```

**Request Validation**
```typescript
{
  email: {
    type: "string",
    required: true,
    format: "email",
    unique: true,
    description: "Must be a valid email address not already registered"
  },
  password: {
    type: "string",
    required: true,
    minLength: 8,
    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
    description: "Must contain: uppercase, lowercase, number, special char (@$!%*?&)"
  },
  user_type: {
    type: "string",
    enum: ["merchant", "buyer"],
    required: true,
    description: "Role type for the platform"
  },
  full_name: {
    type: "string",
    optional: true,
    maxLength: 100,
    description: "User's full name"
  }
}
```

**Success Response** (201 Created)
```json
{
  "status": "success",
  "message": "Registration successful. Check your email for OTP verification.",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "merchant@example.com",
    "user_type": "merchant",
    "email_verified": false,
    "created_at": "2025-11-19T10:30:00Z"
  }
}
```

**Error Responses**

```json
// 400 Bad Request - Validation Error
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must contain uppercase, lowercase, number, and special character"
    }
  ]
}
```

```json
// 409 Conflict - Email Already Exists
{
  "status": "error",
  "message": "Email already registered. Please use login or reset password.",
  "code": "EMAIL_EXISTS"
}
```

```json
// 500 Internal Server Error
{
  "status": "error",
  "message": "Failed to send verification email. Please try again later.",
  "code": "EMAIL_SEND_FAILED"
}
```

**Implementation Logic**

```typescript
/**
 * 1. Validate request body (email format, password strength)
 * 2. Check if email already exists in database
 * 3. Hash password using bcrypt (12 rounds)
 * 4. Generate 6-digit OTP (random)
 * 5. Set OTP expiration to current time + 10 minutes
 * 6. Create user record with:
 *    - email_verified = false
 *    - email_verification_otp = OTP
 *    - email_otp_expires_at = expiration time
 *    - is_active = true
 *    - user_type = provided type
 * 7. Send OTP via email (template: "Verify Your Email")
 * 8. Return 201 with user data (exclude password_hash, OTP)
 * 9. On email send failure: rollback user creation, return 500
 */
```

---

### 2. POST `/auth/verify-email`

**Purpose**: Verify email with OTP and receive JWT token

**Request Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "merchant@example.com",
  "otp": "123456"
}
```

**Request Validation**
```typescript
{
  email: {
    type: "string",
    required: true,
    format: "email",
    description: "Email address to verify"
  },
  otp: {
    type: "string",
    required: true,
    pattern: "^\\d{6}$",
    description: "6-digit OTP sent to email"
  }
}
```

**Success Response** (200 OK)
```json
{
  "status": "success",
  "message": "Email verified successfully.",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "merchant@example.com",
    "email_verified": true,
    "user_type": "merchant",
    "verified_at": "2025-11-19T10:35:00Z"
  }
}
```

**Cookies Set in Response**
```http
Set-Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; 
  HttpOnly; 
  Secure; 
  SameSite=Strict; 
  Max-Age=604800; 
  Path=/
```

**Error Responses**

```json
// 400 Bad Request - Invalid OTP
{
  "status": "error",
  "message": "Invalid or expired OTP. Please request a new one.",
  "code": "INVALID_OTP",
  "retry_count": 2,
  "max_retries": 5
}
```

```json
// 404 Not Found - Email Not Found
{
  "status": "error",
  "message": "Email not found. Please register first.",
  "code": "EMAIL_NOT_FOUND"
}
```

```json
// 429 Too Many Requests - OTP Attempts Exceeded
{
  "status": "error",
  "message": "Too many OTP attempts. Please request a new OTP.",
  "code": "OTP_ATTEMPTS_EXCEEDED",
  "retry_after": 300
}
```

**Implementation Logic**

```typescript
/**
 * 1. Validate request body (email format, OTP format)
 * 2. Find user by email
 * 3. Check if user exists
 * 4. Check if user already verified → return 400 (already verified)
 * 5. Check if OTP provided matches stored OTP
 * 6. Check if OTP has not expired (compare with email_otp_expires_at)
 * 7. Check OTP attempts (max 5 attempts, track per email)
 * 8. On incorrect OTP:
 *    - Increment OTP attempts counter
 *    - If attempts > 5: Lock email for 5 minutes
 *    - Return 400 with remaining attempts
 * 9. On correct OTP:
 *    - Set email_verified = true
 *    - Clear email_verification_otp = null
 *    - Clear email_otp_expires_at = null
 *    - Reset OTP attempts counter
 *    - Generate JWT token with payload (email, user_id, user_type, email_verified)
 *    - Set auth_token cookie (HTTP-Only, Secure, 7-day expiration)
 *    - Return 200 with user data
 * 10. On errors: Return appropriate error response
 */
```

---

### 3. POST `/auth/signin`

**Purpose**: Authenticate user with email and password

**Request Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "merchant@example.com",
  "password": "SecurePassword123!",
  "remember_me": false
}
```

**Request Validation**
```typescript
{
  email: {
    type: "string",
    required: true,
    format: "email"
  },
  password: {
    type: "string",
    required: true,
    minLength: 1
  },
  remember_me: {
    type: "boolean",
    optional: true,
    default: false,
    description: "If true, extend token expiry to 30 days"
  }
}
```

**Success Response** (200 OK)
```json
{
  "status": "success",
  "message": "Sign in successful.",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "merchant@example.com",
    "username": "john_doe",
    "user_type": "merchant",
    "email_verified": true,
    "last_login_at": "2025-11-19T10:40:00Z"
  }
}
```

**Cookies Set in Response**
```http
Set-Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; 
  HttpOnly; 
  Secure; 
  SameSite=Strict; 
  Max-Age=604800; 
  Path=/
```

**Error Responses**

```json
// 400 Bad Request - Email Not Verified
{
  "status": "error",
  "message": "Please verify your email before signing in.",
  "code": "EMAIL_NOT_VERIFIED",
  "action": "Send OTP to verify email"
}
```

```json
// 401 Unauthorized - Invalid Credentials
{
  "status": "error",
  "message": "Invalid email or password.",
  "code": "INVALID_CREDENTIALS",
  "failed_attempts": 3,
  "max_attempts": 5
}
```

```json
// 403 Forbidden - Account Locked
{
  "status": "error",
  "message": "Account locked due to too many failed login attempts. Try again in 15 minutes.",
  "code": "ACCOUNT_LOCKED",
  "locked_until": "2025-11-19T10:55:00Z"
}
```

```json
// 404 Not Found - User Doesn't Exist
{
  "status": "error",
  "message": "User not found. Please register.",
  "code": "USER_NOT_FOUND"
}
```

**Implementation Logic**

```typescript
/**
 * 1. Validate request body (email, password format)
 * 2. Find user by email
 * 3. Check if user exists
 * 4. Check if user account is active (is_active = true)
 * 5. Check if email is verified (email_verified = true)
 *    → If not verified, return 400 with option to resend OTP
 * 6. Check if account is locked (account_locked_until > now)
 *    → If locked, return 403 with unlock time
 * 7. Compare provided password with stored password_hash using bcrypt
 * 8. On incorrect password:
 *    - Increment failed_login_attempts
 *    - If failed_attempts >= 5:
 *      * Set account_locked_until = now + 15 minutes
 *      * Return 403 Forbidden
 *    - Else: Return 401 Unauthorized with attempts count
 * 9. On correct password:
 *    - Reset failed_login_attempts = 0
 *    - Clear account_locked_until = null
 *    - Update last_login_at = now
 *    - Generate JWT token:
 *      * exp = now + (remember_me ? 30 days : 7 days)
 *      * Include email, user_id, user_type, email_verified
 *    - Set auth_token cookie
 *    - Return 200 with user data (exclude password, OTP fields)
 * 10. On errors: Return appropriate error response
 */
```

---

### 4. POST `/auth/resend-otp`

**Purpose**: Resend OTP email for email verification (if initial OTP expired or lost)

**Request Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "merchant@example.com"
}
```

**Request Validation**
```typescript
{
  email: {
    type: "string",
    required: true,
    format: "email"
  }
}
```

**Success Response** (200 OK)
```json
{
  "status": "success",
  "message": "OTP resent to your email. Valid for 10 minutes.",
  "data": {
    "email": "merchant@example.com",
    "resent_at": "2025-11-19T10:45:00Z"
  }
}
```

**Error Responses**

```json
// 404 Not Found
{
  "status": "error",
  "message": "Email not found. Please register first.",
  "code": "EMAIL_NOT_FOUND"
}
```

```json
// 400 Bad Request - Already Verified
{
  "status": "error",
  "message": "Email is already verified. Please sign in.",
  "code": "EMAIL_ALREADY_VERIFIED"
}
```

```json
// 429 Too Many Requests
{
  "status": "error",
  "message": "Too many resend requests. Please try again in 2 minutes.",
  "code": "RESEND_LIMIT_EXCEEDED",
  "retry_after": 120
}
```

**Implementation Logic**

```typescript
/**
 * 1. Validate email format
 * 2. Find user by email
 * 3. Check if email already verified → return 400
 * 4. Check resend rate limit (max 3 resends per 5 minutes)
 *    → If exceeded, return 429
 * 5. Generate new 6-digit OTP
 * 6. Update user: email_verification_otp = new OTP, email_otp_expires_at = now + 10 mins
 * 7. Send OTP via email (same template as register)
 * 8. Return 200 success
 * 9. On email send failure: return 500
 */
```

---

### 5. POST `/auth/logout`

**Purpose**: Invalidate user session and clear authentication token

**Request Headers**
```http
Content-Type: application/json
Cookie: auth_token=...
```

**Request Body**
```json
{}
```

**Success Response** (200 OK)
```json
{
  "status": "success",
  "message": "Logged out successfully."
}
```

**Cookies Cleared in Response**
```http
Set-Cookie: auth_token=; 
  HttpOnly; 
  Secure; 
  SameSite=Strict; 
  Max-Age=0; 
  Path=/
```

**Error Responses**

```json
// 401 Unauthorized - No Active Session
{
  "status": "error",
  "message": "No active session found.",
  "code": "NO_SESSION"
}
```

**Implementation Logic**

```typescript
/**
 * 1. Extract auth_token from cookies
 * 2. If no token exists → return 401
 * 3. Decode JWT to get user_id and email
 * 4. Optional: Add token to blacklist (Redis or Database)
 *    - Store token in blacklist with expiration matching token exp time
 *    - This prevents token reuse if somehow leaked
 * 5. Clear auth_token cookie by setting Max-Age=0
 * 6. Return 200 success
 * 
 * Note: Blacklist is optional but recommended for security
 */
```

---

## 👤 User Endpoints

### 1. GET `/user/profile`

**Purpose**: Retrieve authenticated user's profile information

**Request Headers**
```http
Content-Type: application/json
Cookie: auth_token=...
```

**Required Authentication**: ✅ Yes (verifyAuth middleware)

**Success Response** (200 OK)
```json
{
  "status": "success",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "merchant@example.com",
    "username": "john_doe",
    "full_name": "John Doe",
    "profile_picture_url": "https://cdn.example.com/profiles/user1.jpg",
    "bio": "AI NFT Merchant - Creating digital art with AI",
    "user_type": "merchant",
    "email_verified": true,
    "is_active": true,
    "created_at": "2025-11-19T10:30:00Z",
    "updated_at": "2025-11-19T10:40:00Z",
    "last_login_at": "2025-11-19T10:40:00Z"
  }
}
```

**Error Responses**

```json
// 401 Unauthorized - No Valid Token
{
  "status": "error",
  "message": "Unauthorized. Please sign in.",
  "code": "UNAUTHORIZED"
}
```

**Implementation Logic**

```typescript
/**
 * 1. Middleware verifyAuth validates JWT from cookie
 * 2. Extract user_id from JWT payload (req.user.user_id)
 * 3. Query database for user by user_id
 * 4. Return user data (exclude password_hash, OTP fields)
 * 5. On not found (shouldn't happen): return 404
 */
```

---

### 2. PUT `/user/profile`

**Purpose**: Update user profile information (username, full_name, bio, profile picture)

**Request Headers**
```http
Content-Type: application/json
Cookie: auth_token=...
```

**Request Body**
```json
{
  "username": "john_doe_2025",
  "full_name": "John Doe",
  "bio": "AI NFT Creator | Web3 Enthusiast",
  "profile_picture_url": "https://cdn.example.com/profiles/user1_new.jpg"
}
```

**Request Validation**
```typescript
{
  username: {
    type: "string",
    optional: true,
    minLength: 3,
    maxLength: 30,
    pattern: "^[a-zA-Z0-9_-]+$",
    unique: true,
    description: "Alphanumeric, underscore, hyphen only. Must be unique."
  },
  full_name: {
    type: "string",
    optional: true,
    maxLength: 100,
    description: "User's full name"
  },
  bio: {
    type: "string",
    optional: true,
    maxLength: 500,
    description: "Short biography"
  },
  profile_picture_url: {
    type: "string",
    optional: true,
    format: "url",
    description: "URL to profile picture"
  }
}
```

**Success Response** (200 OK)
```json
{
  "status": "success",
  "message": "Profile updated successfully.",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "merchant@example.com",
    "username": "john_doe_2025",
    "full_name": "John Doe",
    "bio": "AI NFT Creator | Web3 Enthusiast",
    "profile_picture_url": "https://cdn.example.com/profiles/user1_new.jpg",
    "updated_at": "2025-11-19T11:00:00Z"
  }
}
```

**Error Responses**

```json
// 409 Conflict - Username Already Taken
{
  "status": "error",
  "message": "Username already taken. Please choose another.",
  "code": "USERNAME_TAKEN",
  "field": "username"
}
```

```json
// 400 Bad Request - Invalid Input
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "username",
      "message": "Username must be 3-30 characters, alphanumeric only"
    }
  ]
}
```

**Implementation Logic**

```typescript
/**
 * 1. Middleware verifyAuth validates JWT
 * 2. Extract user_id from JWT (req.user.user_id)
 * 3. Validate request body (all fields are optional, but if provided, validate)
 * 4. If username is provided:
 *    - Check if username is already taken by another user
 *    - If taken, return 409
 * 5. Update user record with provided fields only:
 *    - Use PATCH semantics (only update what's provided)
 *    - Set updated_at = now
 * 6. Return 200 with updated user data
 * 7. On concurrent update: handle optimistically or with version control
 */
```

---

### 3. PUT `/user/change-password`

**Purpose**: Change user password (requires current password verification)

**Request Headers**
```http
Content-Type: application/json
Cookie: auth_token=...
```

**Request Body**
```json
{
  "current_password": "SecurePassword123!",
  "new_password": "NewSecurePassword456!",
  "confirm_password": "NewSecurePassword456!"
}
```

**Request Validation**
```typescript
{
  current_password: {
    type: "string",
    required: true,
    minLength: 1
  },
  new_password: {
    type: "string",
    required: true,
    minLength: 8,
    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
  },
  confirm_password: {
    type: "string",
    required: true,
    equals: "new_password"
  }
}
```

**Success Response** (200 OK)
```json
{
  "status": "success",
  "message": "Password changed successfully. Please sign in again.",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "merchant@example.com"
  }
}
```

**Error Responses**

```json
// 401 Unauthorized - Current Password Incorrect
{
  "status": "error",
  "message": "Current password is incorrect.",
  "code": "INCORRECT_PASSWORD"
}
```

```json
// 400 Bad Request - Passwords Don't Match
{
  "status": "error",
  "message": "New password and confirm password do not match.",
  "code": "PASSWORD_MISMATCH"
}
```

**Implementation Logic**

```typescript
/**
 * 1. Middleware verifyAuth validates JWT
 * 2. Extract user_id from JWT
 * 3. Validate request body (all required, password strength)
 * 4. Fetch user from database by user_id
 * 5. Compare current_password with user's password_hash using bcrypt
 * 6. On mismatch: return 401
 * 7. Check that new_password != current_password
 * 8. Hash new_password using bcrypt (12 rounds)
 * 9. Update user: password_hash = new_hash, updated_at = now
 * 10. Optional: Invalidate all other active sessions (user must sign in everywhere)
 *     - Add all tokens to blacklist except this current token
 * 11. Return 200 success
 * 12. Clear auth_token cookie to force re-login for security
 */
```

---

## 🚨 Error Handling

All error responses follow this consistent format:

```typescript
interface ErrorResponse {
  status: "error";
  message: string;           // User-friendly error message
  code: string;              // Machine-readable error code
  field?: string;            // For validation errors
  details?: Record<string, any>; // Additional details (retry_count, etc.)
}
```

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Success - Request completed successfully |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Invalid credentials or no token |
| 403 | Forbidden - Authenticated but not allowed (locked account, etc.) |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists (email, username) |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

---

## 🔒 Security Considerations

### 1. Password Security
- ✅ **Hash Algorithm**: Bcrypt with 12 salt rounds
- ✅ **Minimum Length**: 8 characters
- ✅ **Complexity Requirements**: Uppercase, lowercase, number, special char
- ✅ **Never Log**: Passwords never logged or stored in plain text
- ✅ **Comparison**: Always use constant-time comparison (bcrypt handles this)

### 2. Email & OTP Security
- ✅ **OTP Format**: 6-digit random number (generated using crypto.randomBytes)
- ✅ **OTP Expiration**: 10 minutes max validity
- ✅ **OTP Attempts**: Max 5 attempts, then lock for 5 minutes
- ✅ **Email Delivery**: Use trusted email service (SendGrid, AWS SES)
- ✅ **No Logging**: OTP never returned in API responses (except during registration)

### 3. JWT Security
- ✅ **Storage**: HTTP-Only cookie only (never localStorage)
- ✅ **Cookie Flags**: Secure, HttpOnly, SameSite=Strict
- ✅ **Expiration**: 7 days default, 30 days with "remember_me"
- ✅ **Signature**: HMAC-SHA256 with strong secret (min 32 bytes)
- ✅ **Payload**: Minimal (email, user_id, user_type, email_verified)
- ✅ **Blacklist**: Optional but recommended for logout & password change

### 4. Account Security
- ✅ **Failed Login Attempts**: Max 5 attempts, then 15-minute lockout
- ✅ **Rate Limiting**: 
  - Register/OTP: 3 requests per hour per email
  - Sign in: 5 attempts per 15 minutes per email
  - Resend OTP: 3 requests per 5 minutes per email
- ✅ **Activity Logging**: Track all authentication events
- ✅ **Session Management**: One active session per user (optional: force logout on new login)

### 5. Communication Security
- ✅ **HTTPS Only**: All endpoints over HTTPS in production
- ✅ **CORS**: Whitelist frontend domain only
- ✅ **Request Validation**: Validate all inputs server-side
- ✅ **SQL Injection Prevention**: Use parameterized queries (ORM/prepared statements)
- ✅ **XSS Prevention**: Never store user input in DOM without sanitization

### 6. Infrastructure Security
- ✅ **Environment Variables**: Store secrets (JWT_SECRET, DB_PASSWORD, etc.) in .env
- ✅ **HTTPS Certificates**: Use valid SSL/TLS certificates
- ✅ **CORS Headers**: Set appropriate CORS policies
- ✅ **API Keys**: Never expose in frontend code
- ✅ **Database Access**: Use connection pooling, restrict IP access

---

## 📋 Implementation Checklist

- [ ] Set up TypeScript project structure
- [ ] Configure Express.js with middleware
- [ ] Set up PostgreSQL/MongoDB with User schema
- [ ] Implement password hashing (bcrypt)
- [ ] Implement JWT generation and verification
- [ ] Implement email sending service
- [ ] Implement OTP generation and validation
- [ ] Create verifyAuth middleware
- [ ] Implement rate limiting (Redis recommended)
- [ ] Implement activity logging
- [ ] Set up HTTPS/CORS configuration
- [ ] Add request validation middleware
- [ ] Add comprehensive error handling
- [ ] Add unit & integration tests
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Set up monitoring & logging (Winston, Sentry, etc.)
- [ ] Deploy to staging environment
- [ ] Security audit and penetration testing
- [ ] Deploy to production
