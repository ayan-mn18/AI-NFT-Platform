import cors from 'cors';
import config from '../config/env';

/**
 * CORS Configuration
 * Whitelist trusted frontend domain
 */
export const corsConfig = cors({
  origin: [config.frontendUrl, 'http://localhost:5173'], // Allow frontend URL
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
});

/**
 * Helmet Configuration
 * Security headers
 */
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
};

export default corsConfig;
