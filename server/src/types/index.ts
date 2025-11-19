import { Request } from 'express';

/**
 * User Model Interface - Based on auth.md schema
 */
export interface User {
  // Primary Identifiers
  user_id: string; // UUID v4, Primary Key
  email: string; // Unique, Indexed

  // Authentication
  password_hash: string; // Bcrypt hashed (12 rounds)
  email_verified: boolean; // Default: false
  email_verification_otp: string | null; // 6-digit OTP
  email_otp_expires_at: Date | null; // OTP expiration

  // User Profile
  username: string | null; // Unique, Optional
  full_name: string | null; // Optional
  profile_picture_url: string | null; // Optional
  bio: string | null; // Optional, max 500 chars

  // User Type & Permissions
  user_type: 'merchant' | 'buyer'; // Role type

  // Status
  is_active: boolean; // Default: true

  // Timestamps
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;

  // Security & Sessions
  failed_login_attempts: number; // Default: 0
  account_locked_until: Date | null; // Account lock timestamp
}

/**
 * JWT Token Payload Interface
 */
export interface JWTPayload {
  email: string; // Unique identifier
  user_id: string; // UUID reference
  user_type: 'merchant' | 'buyer';
  email_verified: boolean;
  iat: number; // Issued At timestamp
  exp: number; // Expiration timestamp
}

/**
 * Express Request with User attached
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * API Response Format
 */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  code?: string;
  errors?: ValidationError[];
}

/**
 * Validation Error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
}

/**
 * Activity Log Interface
 */
export interface ActivityLog {
  activity_id: string;
  user_id: string;
  action: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

/**
 * Auth Request Payloads
 */
export interface RegisterRequest {
  email: string;
  password: string;
  user_type: 'merchant' | 'buyer';
  full_name?: string;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface SignInRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface ResendOtpRequest {
  email: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface UpdateProfileRequest {
  username?: string;
  full_name?: string;
  bio?: string;
  profile_picture_url?: string;
}

/**
 * Response DTOs (Data Transfer Objects)
 */
export interface UserResponse {
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  profile_picture_url: string | null;
  bio: string | null;
  user_type: 'merchant' | 'buyer';
  email_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

/**
 * Error Response Interface
 */
export interface ErrorResponse {
  status: 'error';
  message: string;
  code: string;
  field?: string;
  details?: Record<string, any>;
}

/**
 * Rate Limit Error
 */
export interface RateLimitError extends ErrorResponse {
  retry_after: number;
}

/**
 * Authentication Error Codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_NOT_FOUND = 'EMAIL_NOT_FOUND',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INVALID_OTP = 'INVALID_OTP',
  OTP_EXPIRED = 'OTP_EXPIRED',
  OTP_ATTEMPTS_EXCEEDED = 'OTP_ATTEMPTS_EXCEEDED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',
  INCORRECT_PASSWORD = 'INCORRECT_PASSWORD',
  USERNAME_TAKEN = 'USERNAME_TAKEN',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  NO_SESSION = 'NO_SESSION',
  RESEND_LIMIT_EXCEEDED = 'RESEND_LIMIT_EXCEEDED',
}

/**
 * Custom Error Class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: AuthErrorCode | string = 'INTERNAL_SERVER_ERROR',
    public field?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
