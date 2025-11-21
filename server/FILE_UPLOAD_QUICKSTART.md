# File Upload System - Quick Start

## 1. Environment Setup (5 minutes)

```bash
# Copy these to your .env file in /server directory
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET=ai-nft-platform-files
AWS_S3_URL=https://s3.us-east-1.amazonaws.com/ai-nft-platform-files
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf
ENABLE_FILE_UPLOAD=true
```

**Don't have AWS credentials?** See `AWS_SETUP_GUIDE.md`

## 2. Database Setup (2 minutes)

```bash
# Run migration
supabase db push

# Or manually execute SQL
# Copy: server/database/migrations/001_create_file_uploads_table.sql
# Into: Supabase SQL Editor → Execute
```

## 3. Restart Server (1 minute)

```bash
# Terminal in /server directory
npm run dev
# Server should start without errors
```

## 4. Test Upload (2 minutes)

### Using cURL
```bash
curl -X POST http://localhost:3001/api/file/upload \
  -H "Cookie: auth=$(echo -n 'your_jwt_token' | base64)" \
  -F "file=@test.jpg" \
  -F "category=PROFILE_PICTURES"
```

### Using Browser DevTools Console
```javascript
const formData = new FormData();
formData.append('file', document.querySelector('input[type="file"]').files[0]);
formData.append('category', 'PROFILE_PICTURES');

fetch('/api/file/upload', {
  method: 'POST',
  body: formData,
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

## API Endpoints

### Upload
```
POST /api/file/upload
Content-Type: multipart/form-data

file: (file)
category: PROFILE_PICTURES|NFT_IMAGES|DOCUMENTS|THUMBNAILS|BANNERS
description: (optional)
```

### List
```
GET /api/file/list?category=PROFILE_PICTURES
```

### Delete
```
DELETE /api/file/{fileId}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Access Denied" in S3 | Check AWS credentials in .env |
| "File type not allowed" | Add MIME type to ALLOWED_FILE_TYPES |
| "Unauthorized" on upload | Ensure auth cookie is being sent |
| "File too large" | Increase MAX_FILE_SIZE in .env |
| Database migration fails | Verify Supabase connection |

## File Organization in S3

```
{category}/{user_id}/{timestamp}-{random}-{filename}
```

Example:
```
PROFILE_PICTURES/123e4567-e89b-12d3-a456-426614174000/1704067200000-abc123-photo.jpg
```

## What's Implemented

✅ Upload files to AWS S3  
✅ Secure file organization by user  
✅ File metadata in database  
✅ List user's files  
✅ Soft delete files  
✅ MIME type validation  
✅ File size limits  
✅ Error handling  
✅ Authentication required  
✅ Row-level security  

## Files Structure

```
server/
├── src/
│   ├── config/
│   │   ├── aws.ts              ← S3 client initialization
│   │   └── env.ts              ← AWS env variables
│   ├── controllers/
│   │   └── fileController.ts   ← HTTP handlers
│   ├── services/
│   │   └── fileUploadService.ts ← S3 operations
│   ├── utils/
│   │   └── fileUploadUtils.ts  ← Validation & helpers
│   ├── routes/
│   │   └── file.ts             ← Route definitions
│   └── types/
│       └── index.ts            ← File type definitions
├── database/
│   └── migrations/
│       └── 001_create_file_uploads_table.sql
├── AWS_SETUP_GUIDE.md          ← Complete AWS setup
└── FILE_UPLOAD_SYSTEM.md       ← Full documentation
```

## Next Steps

1. ✅ Get AWS credentials (see AWS_SETUP_GUIDE.md)
2. ✅ Add to .env file
3. ✅ Run database migration
4. ✅ Restart server
5. ✅ Test with sample file
6. ✅ Integrate into UI

---

**Questions?** See FILE_UPLOAD_SYSTEM.md for detailed documentation
