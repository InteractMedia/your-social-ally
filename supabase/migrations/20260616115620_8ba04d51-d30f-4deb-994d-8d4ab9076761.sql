
CREATE POLICY "post_media_anon_select" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'post-media');
CREATE POLICY "post_media_anon_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'post-media');
CREATE POLICY "post_media_anon_update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'post-media') WITH CHECK (bucket_id = 'post-media');
CREATE POLICY "post_media_anon_delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'post-media');
