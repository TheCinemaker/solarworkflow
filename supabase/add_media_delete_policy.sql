-- 1. DELETE policy a public.media táblához - CSAK adminoknak
DROP POLICY IF EXISTS "Enable delete for admin users" ON public.media;
CREATE POLICY "Enable delete for admin users" ON public.media FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 2. DELETE policy a storage.objects táblához (project-photos vödör) - CSAK adminoknak
DROP POLICY IF EXISTS "Enable delete of project-photos for admins" ON storage.objects;
CREATE POLICY "Enable delete of project-photos for admins" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
