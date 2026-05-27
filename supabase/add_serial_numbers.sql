-- A meglévő projektek táblájának bővítése új mezőkkel
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS tasks TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT,
ADD COLUMN IF NOT EXISTS start_time TEXT,
ADD COLUMN IF NOT EXISTS end_time TEXT,
ADD COLUMN IF NOT EXISTS important_info TEXT,
ADD COLUMN IF NOT EXISTS completed_tasks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS telegram_link TEXT,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- A meglévő dolgozók (profiles) táblájának bővítése
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- Munkalapok (worklogs) tábla bővítése a mettől-meddig adatokkal
ALTER TABLE public.worklogs
ADD COLUMN IF NOT EXISTS start_time TEXT,
ADD COLUMN IF NOT EXISTS end_time TEXT;

-- Média (media) tábla bővítése hiba és javítás követő mezőkkel (Before/After)
ALTER TABLE public.media
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_issue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS resolved_file_path TEXT,
ADD COLUMN IF NOT EXISTS resolved_comment TEXT;

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

-- GOLYÓÁLLÓ REALTIME BEKAPCSOLÁS
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'projects már tagja, kihagyás...';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'profiles már tagja, kihagyás...';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.worklogs;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'worklogs már tagja, kihagyás...';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.media;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'media már tagja, kihagyás...';
  END;
END $$;
