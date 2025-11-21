-- ============================================
-- FILE UPLOADS TABLE
-- ============================================
-- Stores metadata for all files uploaded to S3
-- Each record corresponds to a file stored in the S3 bucket
-- S3 keys are organized as: {category}/{user_id}/{timestamp}-{random}-{sanitized_filename}

CREATE TABLE IF NOT EXISTS file_uploads (
  -- Primary Key
  file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File Information
  original_filename VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL UNIQUE, -- Full S3 object key
  s3_url VARCHAR(1000) NOT NULL,       -- Public URL for accessing file
  file_size BIGINT NOT NULL,           -- File size in bytes
  mime_type VARCHAR(100) NOT NULL,

  -- Categorization
  category VARCHAR(50) NOT NULL CHECK (category IN ('PROFILE_PICTURES', 'NFT_IMAGES', 'DOCUMENTS', 'THUMBNAILS', 'BANNERS')),
  description TEXT,

  -- Metadata
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size > 0)
);

-- ============================================
-- INDEXES
-- ============================================
-- Optimizes queries for listing user files and filtering by category
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_category ON file_uploads(category);
CREATE INDEX idx_file_uploads_user_category ON file_uploads(user_id, category);
CREATE INDEX idx_file_uploads_not_deleted ON file_uploads(user_id, is_deleted);
CREATE INDEX idx_file_uploads_user_category_deleted ON file_uploads(user_id, category, is_deleted);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Users can only view and delete their own files
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own files"
  ON file_uploads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON file_uploads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON file_uploads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON file_uploads
  FOR DELETE
  USING (auth.uid() = user_id);
