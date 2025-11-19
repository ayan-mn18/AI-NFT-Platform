import 'express-async-errors';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// Configuration imports
import config from './config/env';
import logger from './config/logger';
import { initializeSupabase, testSupabaseConnection } from './config/supabase';

// Middleware imports
import {
  corsConfig,
  globalLimiter,
  requestLogger,
  errorHandler,
  verifyAuth,
} from './middleware';

// Route imports
import { authRoutes } from './routes';

const app: Express = express();

/**
 * ============================================
 * MIDDLEWARE SETUP
 * ============================================
 */

// Security Middleware
app.use(helmet());
app.use(corsConfig);

// Request parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));
app.use(cookieParser());

// Logging middleware
app.use(requestLogger);

// Rate limiting
app.use(globalLimiter);

/**
 * ============================================
 * HEALTH CHECK & INFO ROUTES (No auth required)
 * ============================================
 */

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Welcome to AI-NFT Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      nft: '/api/nft',
      marketplace: '/api/marketplace',
    },
  });
});

app.get('/api', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'AI-NFT Platform API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

/**
 * ============================================
 * ROUTE MOUNTING
 * ============================================
 */

// Auth routes - No authentication required for register/signin/verify-email
app.use('/api/auth', authRoutes);

// User routes will be mounted here (Protected routes)
// app.use('/api/user', verifyAuth, userRoutes);

// NFT routes will be mounted here
// app.use('/api/nft', verifyAuth, nftRoutes);

/**
 * ============================================
 * 404 HANDLER
 * ============================================
 */

app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

/**
 * ============================================
 * ERROR HANDLING MIDDLEWARE (Last middleware)
 * ============================================
 */

app.use(errorHandler);

/**
 * ============================================
 * SERVER INITIALIZATION
 * ============================================
 */

const startServer = async () => {
  try {
    // Initialize Supabase connection
    logger.info('Initializing Supabase...');
    await initializeSupabase();

    // Test Supabase connection
    logger.info('Testing Supabase connection...');
    const isConnected = await testSupabaseConnection();

    if (!isConnected) {
      logger.warn(
        '⚠️  Supabase connection test failed. This may be expected if credentials are not yet configured.'
      );
    }

    // Start Express server
    const PORT = config.port;
    app.listen(PORT, () => {
      logger.info(`✅ Server is running on http://localhost:${PORT}`);
      logger.info(`📍 API URL: http://localhost:${PORT}/api`);
      logger.info(`🔍 Health check: http://localhost:${PORT}/health`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server', { error });
    process.exit(1);
  }
};

startServer();

export default app;
