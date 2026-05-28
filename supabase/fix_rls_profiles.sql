-- 1. Segédfunkció az admin szerepkör ellenőrzésére (bypassing recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. A korábbi szigorú módosítási policy törlése
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users and admins" ON public.profiles;

-- 3. Új policy létrehozása, amely engedi a saját profil szerkesztését, VAGY ha a bejelentkezett felhasználó Admin
CREATE POLICY "Enable update for users and admins" ON public.profiles
FOR UPDATE TO authenticated
USING (
  (auth.uid() = id) OR (public.is_admin() = true)
)
WITH CHECK (
  (auth.uid() = id) OR (public.is_admin() = true)
);
