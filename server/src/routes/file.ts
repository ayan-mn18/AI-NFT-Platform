import { Router } from 'express';
import multer from 'multer';
import { verifyAuth } from '../middleware/verifyAuth';
import { uploadFile, getUserFilesList, deleteFile } from '../controllers/fileController';
import config from '../config/env';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    // Validate MIME type
    if (!config.allowedFileTypes.includes(file.mimetype)) {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
      return;
    }
    cb(null, true);
  },
});

/**
 * POST /file/upload
 * Upload a file to S3
 * Requires: multipart/form-data with 'file' and 'category' fields
 * Protected: Yes (requires authentication)
 */
router.post('/upload', verifyAuth, upload.single('file'), uploadFile);

/**
 * GET /file/list
 * Get list of files for authenticated user
 * Query params: category (optional)
 * Protected: Yes (requires authentication)
 */
router.get('/list', verifyAuth, getUserFilesList);

/**
 * DELETE /file/:fileId
 * Soft delete a file (mark as deleted)
 * Protected: Yes (requires authentication and ownership)
 */
router.delete('/:fileId', verifyAuth, deleteFile);

export default router;
