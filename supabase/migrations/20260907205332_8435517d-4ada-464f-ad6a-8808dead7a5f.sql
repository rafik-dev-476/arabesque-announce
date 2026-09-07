
CREATE POLICY "team reads media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'announcement-media' AND public.is_team(auth.uid()));
CREATE POLICY "team uploads media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'announcement-media' AND public.is_team(auth.uid()));
CREATE POLICY "team updates media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'announcement-media' AND public.is_team(auth.uid()));
CREATE POLICY "team deletes media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'announcement-media' AND public.is_team(auth.uid()));
