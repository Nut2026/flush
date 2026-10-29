-- Allow public (unauthenticated) uploads to generated-media bucket for pet sprites
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('generated-media', 'generated-media', true, 52428800, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

-- Policy: allow anyone to upload to pets/ path
CREATE POLICY "public_upload_pets"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'generated-media' AND (storage.foldername(name))[1] = 'pets');

-- Policy: allow anyone to update (upsert) pets/ path
CREATE POLICY "public_update_pets"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'generated-media' AND (storage.foldername(name))[1] = 'pets');

-- Policy: allow public read
CREATE POLICY "public_read_generated_media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'generated-media');