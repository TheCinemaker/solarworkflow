-- Engedélyezzük az UUID kiegészítőt (ha még nincs bekapcsolva)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profil tábla (az auth.users kiterjesztése, hogy lássuk a nevét és szerepkörét)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'worker', -- lehet 'admin' vagy 'worker'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projektek tábla
CREATE TABLE public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  client_name TEXT NOT NULL,
  deadline DATE NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Munkalapok tábla (Worklogs)
CREATE TABLE public.worklogs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  hours NUMERIC NOT NULL,
  description TEXT NOT NULL,
  materials TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Képek / Fájlok metaadatai tábla 
CREATE TABLE public.media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Chat üzenetek
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGER: Autómatikusan hozzon létre egy 'profile' rekordot, amikor egy user beregisztrál az appban
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'worker')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- BIZTONSÁG: Row Level Security (RLS) bekapcsolása minden táblán
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worklogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- EGYSZERŰ BIZTONSÁGI SZABÁLYOK AZ INDULÁSHOZ (Minden bejelentkezett lát mindent)
CREATE POLICY "Enable read access for all authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable update for users based on id" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Enable read for authenticated users" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.projects FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users" ON public.worklogs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.worklogs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON public.media FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.media FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);
