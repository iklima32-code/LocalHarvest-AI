-- ============================================================
-- Video Support Migration
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Keep file size limit at 50MB (free tier max) and explicitly
--    allow both image and video MIME types.
UPDATE storage.buckets
SET
    file_size_limit = 52428800, -- 50MB in bytes (free tier limit)
    allowed_mime_types = ARRAY[
        -- Images (existing)
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
        -- Videos (new)
        'video/mp4',
        'video/quicktime',   -- .mov
        'video/webm',
        'video/x-msvideo',   -- .avi
        'video/x-matroska'   -- .mkv
    ]
WHERE id = 'harvest-photos';

-- 2. Verify the change
SELECT
    id,
    name,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'harvest-photos';
