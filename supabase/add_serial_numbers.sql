-- A meglévő projektek táblájának bővítése új mezőkkel
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS tasks TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT,
ADD COLUMN IF NOT EXISTS start_time TEXT,
ADD COLUMN IF NOT EXISTS end_time TEXT,
ADD COLUMN IF NOT EXISTS important_info TEXT,
ADD COLUMN IF NOT EXISTS completed_tasks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- A meglévő dolgozók (profiles) táblájának bővítése
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- A régi auth trigger törlése és új létrehozása
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, serial_number)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'worker'),
    new.raw_user_meta_data->>'serial_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. VALÓS IDEJŰ (REALTIME) SZINKRONIZÁCIÓ BEKAPCSOLÁSA A TÁBLÁKON
-- Ezzel engedélyezzük, hogy a Supabase azonnal értesítse az appot bármilyen változásról!
-- (Ha valamelyik tábla már fel van véve a publikációba, az SQL hibát dobhat rá, ami figyelmen kívül hagyható)
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
