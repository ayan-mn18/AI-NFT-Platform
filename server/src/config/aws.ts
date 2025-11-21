import { S3Client } from '@aws-sdk/client-s3';
import config from './env';
import logger from './logger';

/**
 * AWS S3 Configuration
 * Initializes S3 client with credentials from environment variables
 * 
 * Required Environment Variables:
 * - AWS_REGION: AWS region (e.g., us-east-1, ap-south-1)
 * - AWS_ACCESS_KEY_ID: AWS IAM user access key
 * - AWS_SECRET_ACCESS_KEY: AWS IAM user secret access key
 * - AWS_S3_BUCKET: S3 bucket name for storing files
 * - AWS_S3_URL: CloudFront or S3 public URL for accessing files
 */

let s3Client: S3Client | null = null;

/**
 * Get or create S3 client instance
 */
export const getS3Client = (): S3Client => {
  if (s3Client) {
    return s3Client;
  }

  if (!config.awsRegion || !config.awsAccessKeyId || !config.awsSecretAccessKey) {
    throw new Error(
      'AWS credentials not configured. Ensure AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are set.'
    );
  }

  s3Client = new S3Client({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });

  logger.info('✅ AWS S3 client initialized', {
    region: config.awsRegion,
    bucket: config.awsS3Bucket,
  });

  return s3Client;
};

/**
 * Validate S3 configuration
 */
export const validateS3Config = (): void => {
  if (!config.awsS3Bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is required');
  }

  if (!config.awsS3Url) {
    throw new Error('AWS_S3_URL environment variable is required');
  }

  logger.info('✅ AWS S3 configuration validated');
};

export default {
  getS3Client,
  validateS3Config,
};
