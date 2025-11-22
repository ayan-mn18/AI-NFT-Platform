import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment Configuration
 * Validates and exports all environment variables
 * Throws error if required variables are missing
 */

interface EnvConfig {
  // Server
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  apiUrl: string;
  frontendUrl: string;

  // Supabase
  supabaseUrl: string;
  supabaseKey: string;
  supabaseJwtSecret: string;

  // JWT
  jwtSecret: string;
  jwtExpiration: string;
  jwtRefreshExpiration: string;

  // Email
  emailService: string;
  emailFrom: string;
  sendgridApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;

  // Redis
  redisUrl: string;
  redisPassword?: string;

  // AWS S3
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsS3Bucket: string;
  awsS3Url: string;
  maxFileSize: number; // in bytes
  allowedFileTypes: string[];

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'simple';

  // Security
  bcryptRounds: number;
  maxLoginAttempts: number;
  accountLockTimeMinutes: number;
  otpExpirationMinutes: number;
  otpLength: number;

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  // Database
  databasePoolMin: number;
  databasePoolMax: number;
  databaseIdleTimeout: number;

  // Chat System
  geminiApiKey: string;
  geminiModel: string;
  defaultTokenLimit: number;
  maxChatsPerUser: number;

  // Feature Flags
  enableEmailVerification: boolean;
  enableActivityLogging: boolean;
  enableTokenBlacklist: boolean;
  enableFileUpload: boolean;
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value || defaultValue!;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
};

const getEnvBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value ? value.toLowerCase() === 'true' : defaultValue!;
};

const config: EnvConfig = {
  // Server
  nodeEnv: (process.env.NODE_ENV || 'development') as any,
  port: getEnvNumber('PORT', 3000),
  apiUrl: getEnv('API_URL', 'http://localhost:3000'),
  frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:5173'),

  // Supabase
  supabaseUrl: getEnv('SUPABASE_URL'),
  supabaseKey: getEnv('SUPABASE_KEY'),
  supabaseJwtSecret: getEnv('SUPABASE_JWT_SECRET'),

  // JWT
  jwtSecret: getEnv('JWT_SECRET'),
  jwtExpiration: getEnv('JWT_EXPIRATION', '7d'),
  jwtRefreshExpiration: getEnv('JWT_REFRESH_EXPIRATION', '30d'),

  // Email
  emailService: getEnv('EMAIL_SERVICE', ''),
  emailFrom: getEnv('EMAIL_FROM', 'ayanmansoori44@gmail.com'),
  sendgridApiKey: getEnv('SENDGRID_API_KEY', 'abc'),
  smtpHost: getEnv('SMTP_HOST', ''),
  smtpPort: getEnvNumber('SMTP_PORT', 587),
  smtpUser: getEnv('SMTP_USER', ''),
  smtpPass: getEnv('SMTP_PASS', ''),

  // Redis
  redisUrl: getEnv('REDIS_URL', 'redis://localhost:6379'),
  redisPassword: getEnv('REDIS_PASSWORD', 'your-redis-password'),

  // AWS S3
  awsRegion: getEnv('AWS_REGION', 'us-east-1'),
  awsAccessKeyId: getEnv('AWS_ACCESS_KEY_ID'),
  awsSecretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY'),
  awsS3Bucket: getEnv('AWS_S3_BUCKET'),
  awsS3Url: getEnv('AWS_S3_URL', ''),
  maxFileSize: getEnvNumber('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB default
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp,application/pdf').split(','),

  // Logging
  logLevel: (process.env.LOG_LEVEL || 'info') as any,
  logFormat: (process.env.LOG_FORMAT || 'json') as any,

  // Security
  bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
  maxLoginAttempts: getEnvNumber('MAX_LOGIN_ATTEMPTS', 5),
  accountLockTimeMinutes: getEnvNumber('ACCOUNT_LOCK_TIME_MINUTES', 15),
  otpExpirationMinutes: getEnvNumber('OTP_EXPIRATION_MINUTES', 10),
  otpLength: getEnvNumber('OTP_LENGTH', 6),

  // Rate Limiting
  rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
  rateLimitMaxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),

  // Database
  databasePoolMin: getEnvNumber('DATABASE_POOL_MIN', 2),
  databasePoolMax: getEnvNumber('DATABASE_POOL_MAX', 10),
  databaseIdleTimeout: getEnvNumber('DATABASE_IDLE_TIMEOUT', 30000),

  // Chat System
  geminiApiKey: getEnv('GEMINI_API_KEY', ''),
  geminiModel: getEnv('GEMINI_MODEL_NAME', 'gemini-2.0-flash'),
  defaultTokenLimit: getEnvNumber('DEFAULT_TOKEN_LIMIT', 100000),
  maxChatsPerUser: getEnvNumber('MAX_CHATS_PER_USER', 5),

  // Feature Flags
  enableEmailVerification: getEnvBoolean('ENABLE_EMAIL_VERIFICATION', true),
  enableActivityLogging: getEnvBoolean('ENABLE_ACTIVITY_LOGGING', true),
  enableTokenBlacklist: getEnvBoolean('ENABLE_TOKEN_BLACKLIST', true),
  enableFileUpload: getEnvBoolean('ENABLE_FILE_UPLOAD', true),
};

/**
 * Validate that JWT_SECRET is at least 32 bytes for HS256
 */
if (config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

/**
 * Validate email configuration
 */
if (config.emailService === 'sendgrid' && !config.sendgridApiKey) {
  throw new Error('SENDGRID_API_KEY is required when EMAIL_SERVICE=sendgrid');
}

export default config;
