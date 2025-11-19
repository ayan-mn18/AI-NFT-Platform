import { createClient } from '@supabase/supabase-js';
import config from './env';
import logger from './logger';

/**
 * Supabase Client Configuration
 * Initialize Supabase client for database operations
 * Uses the anon key for client-side operations
 */

let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize Supabase client
 * Should be called once during app startup
 */
export const initializeSupabase = async () => {
  try {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error(
        'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_KEY in .env'
      );
    }

    logger.info('Initializing Supabase client...', {
      url: config.supabaseUrl,
    });

    supabaseClient = createClient(config.supabaseUrl, config.supabaseKey);

    logger.info('✅ Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    logger.error('❌ Failed to initialize Supabase', { 
      error: error instanceof Error ? error.message : error,
      supabaseUrl: config.supabaseUrl ? '***' : 'NOT SET',
    });
    throw error;
  }
};

/**
 * Get Supabase client instance
 * Make sure initializeSupabase() is called before using this
 */
export const getSupabaseClient = () => {
  if (!supabaseClient) {
    throw new Error(
      'Supabase client not initialized. Call initializeSupabase() first.'
    );
  }
  return supabaseClient;
};

/**
 * Test Supabase connection
 * Tests basic connectivity without requiring specific tables
 */
export const testSupabaseConnection = async () => {
  try {
    const client = getSupabaseClient();
    
    // Simple test: Try to query the users table if it exists
    const { error: userError } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .limit(1);

    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 means table doesn't exist, which is fine during setup
      throw userError;
    }

    logger.info('✅ Supabase connection test successful');
    return true;
  } catch (error) {
    logger.warn('⚠️  Supabase connection test result', { 
      message: error instanceof Error ? error.message : error,
      info: 'This may be expected if database tables are not yet created',
    });
    return false;
  }
};

export default {
  initializeSupabase,
  getSupabaseClient,
  testSupabaseConnection,
};
