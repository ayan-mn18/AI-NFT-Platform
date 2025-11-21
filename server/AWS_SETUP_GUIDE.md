# AWS S3 File Upload System - Setup Guide

This guide explains how to set up the AWS S3 integration for the AI-NFT Platform file upload system.

## Overview

The file upload system stores files in AWS S3 with metadata tracked in the Supabase database. Files are organized by category and user ID for security and organization.

### Architecture
- **Storage**: AWS S3 bucket
- **Metadata**: Supabase PostgreSQL database
- **Access**: HTTP API with JWT authentication
- **Delivery**: Public S3 URL or CloudFront CDN (optional)

### S3 Key Structure
```
{category}/{user_id}/{timestamp}-{random}-{sanitized_filename}
```

Example:
```
PROFILE_PICTURES/123e4567-e89b-12d3-a456-426614174000/1704067200000-abc123-john_doe.jpg
NFT_IMAGES/223e4567-e89b-12d3-a456-426614174000/1704067200000-def456-artwork.png
```

## Prerequisites

1. AWS Account with billing enabled
2. AWS IAM user created with S3 access
3. S3 bucket created and configured
4. Supabase project with auth enabled

## Step 1: Create AWS IAM User

### Create an IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/home)
2. Click **Users** → **Create user**
3. Enter username: `ai-nft-platform-upload` (or similar)
4. Click **Next**

### Attach S3 Permissions

1. Click **Attach policies directly**
2. Search for `AmazonS3FullAccess`
3. Check the checkbox for `AmazonS3FullAccess`
4. Click **Next** → **Create user**

### Generate Access Keys

1. Click on the newly created user
2. Go to **Security credentials** tab
3. Click **Create access key**
4. Select **Application running outside AWS**
5. Click **Next** → **Create access key**
6. **Copy and save these values**:
   - **Access Key ID**: Starts with `ASIA` or `AKIA`
   - **Secret Access Key**: 40-character string

⚠️ **Important**: Save these immediately. You won't be able to see the secret key again.

## Step 2: Create S3 Bucket

### Create Bucket

1. Go to [S3 Console](https://console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Enter bucket name: `ai-nft-platform-files` (must be globally unique)
4. Select region: `us-east-1` (or your preferred region)
5. Click **Create bucket**

### Enable Public Read Access (if using S3 URLs directly)

1. Select your bucket
2. Go to **Permissions** tab
3. Scroll to **Block public access (bucket settings)**
4. Click **Edit**
5. **Uncheck** "Block all public access" (if you want public file access)
6. Click **Save changes** and confirm

⚠️ **Security Note**: Only enable public access if you want files to be publicly readable. For private files, keep it blocked and use signed URLs instead.

### Set Up CORS (Required for File Uploads from Browser)

1. Go to **Permissions** tab → **CORS**
2. Click **Edit** and replace with:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000", "http://localhost:5173", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Update the `AllowedOrigins` with your actual domain.

## Step 3: (Optional) Set Up CloudFront CDN

CloudFront provides faster file delivery and additional security options.

### Create CloudFront Distribution

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Click **Create distribution**
3. Set origin:
   - **Origin domain**: Select your S3 bucket
   - **Origin access**: Select "Origin access control settings (recommended)"
   - Click **Create OAC** and accept defaults
4. Set behavior:
   - **Viewer protocol policy**: "Redirect HTTP to HTTPS"
   - **Compress objects automatically**: Enable
5. Click **Create distribution**
6. Wait for deployment (15-20 minutes)

### Update Bucket Policy for CloudFront

1. Copy the policy CloudFront provides
2. Go to S3 bucket → **Permissions** → **Bucket policy**
3. Replace with the policy from CloudFront
4. Click **Save**

## Step 4: Configure Environment Variables

Add these variables to your `.env` file in the `server/` directory:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA_YOUR_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_S3_BUCKET=ai-nft-platform-files
AWS_S3_URL=https://s3.us-east-1.amazonaws.com/ai-nft-platform-files
# OR if using CloudFront:
# AWS_S3_URL=https://d123456abc.cloudfront.net

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf
ENABLE_FILE_UPLOAD=true
```

### Required Credentials Summary

| Variable | Value | Example |
|----------|-------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | IAM access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_S3_BUCKET` | S3 bucket name | `ai-nft-platform-files` |
| `AWS_S3_URL` | Public bucket/CDN URL | `https://d123.cloudfront.net` |
| `MAX_FILE_SIZE` | Max file size in bytes | `10485760` (10MB) |
| `ALLOWED_FILE_TYPES` | MIME types | `image/jpeg,image/png,application/pdf` |

## Step 5: Run Database Migration

Apply the file_uploads table schema to your Supabase database:

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Manually run SQL
# Copy contents of: server/database/migrations/001_create_file_uploads_table.sql
# Paste into Supabase SQL Editor and execute
```

## Step 6: Test the System

### Using curl (if file already exists)

```bash
curl -X POST http://localhost:3001/api/file/upload \
  -H "Content-Type: multipart/form-data" \
  -H "Cookie: auth=your_jwt_token" \
  -F "file=@/path/to/image.jpg" \
  -F "category=PROFILE_PICTURES" \
  -F "description=My profile picture"
```

### Using JavaScript/Fetch

```javascript
const formData = new FormData();
const fileInput = document.querySelector('input[type="file"]');
formData.append('file', fileInput.files[0]);
formData.append('category', 'PROFILE_PICTURES');
formData.append('description', 'My profile picture');

const response = await fetch('/api/file/upload', {
  method: 'POST',
  body: formData,
  credentials: 'include', // Sends auth cookie
});

const result = await response.json();
console.log('Uploaded file:', result.data);
```

### Expected Response

```json
{
  "status": "success",
  "message": "File uploaded successfully",
  "data": {
    "file_id": "123e4567-e89b-12d3-a456-426614174000",
    "s3_url": "https://d123.cloudfront.net/PROFILE_PICTURES/123e4567-e89b-12d3-a456-426614174000/1704067200000-abc123-photo.jpg",
    "filename": "photo.jpg",
    "size": 245678,
    "mime_type": "image/jpeg",
    "category": "PROFILE_PICTURES",
    "uploaded_at": "2024-01-01T12:00:00Z"
  }
}
```

## API Endpoints

### Upload File

```http
POST /api/file/upload
Content-Type: multipart/form-data
Cookie: auth=<JWT_TOKEN>

file: <binary_file>
category: PROFILE_PICTURES|NFT_IMAGES|DOCUMENTS|THUMBNAILS|BANNERS
description: (optional) string
```

**Response**: File metadata with S3 URL

---

### List User Files

```http
GET /api/file/list?category=PROFILE_PICTURES
Cookie: auth=<JWT_TOKEN>
```

**Query Parameters**:
- `category` (optional): Filter by file category

**Response**: Array of file metadata

---

### Delete File

```http
DELETE /api/file/:fileId
Cookie: auth=<JWT_TOKEN>
```

**Response**: Success message (soft delete - file marked as deleted in DB)

## File Categories

- **PROFILE_PICTURES**: User profile photos
- **NFT_IMAGES**: NFT artwork and images
- **DOCUMENTS**: PDFs, documents, proofs
- **THUMBNAILS**: Thumbnail images
- **BANNERS**: Banner and header images

## Security Features

### Implemented

✅ **User Isolation**: S3 keys include user_id to prevent cross-user access
✅ **Authentication Required**: All endpoints require JWT auth
✅ **File Validation**: MIME type whitelist and size limits
✅ **Database Row-Level Security**: PostgreSQL RLS policies
✅ **Soft Delete**: Files marked as deleted, preserving audit trail
✅ **Error Handling**: Comprehensive error messages with error codes

### Recommended Additional Security

- Enable S3 versioning for file recovery
- Enable S3 encryption (Server-Side Encryption with S3-Managed Keys)
- Use VPC endpoints for private S3 access (for backend services)
- Set up CloudWatch monitoring for S3 API calls
- Implement file scan/antivirus integration
- Use signed URLs for temporary file access

## Troubleshooting

### "Access Denied" Error

**Cause**: IAM user doesn't have S3 permissions
**Solution**: 
1. Go to IAM user → Permissions
2. Ensure `AmazonS3FullAccess` policy is attached
3. Verify bucket name in `AWS_S3_BUCKET` environment variable

### "File uploaded but URL is wrong"

**Cause**: `AWS_S3_URL` doesn't match bucket region
**Solution**:
```bash
# S3 URL format: https://s3.{REGION}.amazonaws.com/{BUCKET}
# Example for us-west-2:
AWS_S3_URL=https://s3.us-west-2.amazonaws.com/ai-nft-platform-files
```

### CORS Errors when uploading from browser

**Cause**: S3 CORS configuration is missing or incorrect
**Solution**: Check S3 bucket → Permissions → CORS and ensure `AllowedOrigins` includes your domain

### File not accessible after upload

**Cause**: S3 bucket public access is blocked
**Solution**:
- If you want public access: Unblock public access and set proper bucket policy
- If you want private access: Use signed URLs instead of direct S3 URLs

## References

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS IAM User Guide](https://docs.aws.amazon.com/iam/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
