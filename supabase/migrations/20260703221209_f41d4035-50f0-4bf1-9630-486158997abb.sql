
DROP POLICY IF EXISTS post_media_anon_select ON storage.objects;
DROP POLICY IF EXISTS post_media_anon_insert ON storage.objects;
DROP POLICY IF EXISTS post_media_anon_update ON storage.objects;
DROP POLICY IF EXISTS post_media_anon_delete ON storage.objects;

CREATE POLICY "post_media_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "post_media_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "post_media_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "post_media_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
