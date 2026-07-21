-- Supabase RLS Policy-k az Adminisztrátori szerkesztéshez és törléshez a worklogs táblán

-- 1. Engedélyezzük az UPDATE (szerkesztés) műveletet az admin szerepkörű felhasználóknak
CREATE POLICY "Enable update for admin users" ON public.worklogs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 2. Engedélyezzük a DELETE (törlés) műveletet az admin szerepkörű felhasználóknak
CREATE POLICY "Enable delete for admin users" ON public.worklogs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
