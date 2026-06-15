-- Új tábla a visszajelzésekhez
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS bekapcsolása a reviews táblán
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Beszúrás engedélyezése publikusan (mindenki számára)
CREATE POLICY "Enable insert for public anonymous users" 
ON public.reviews FOR INSERT TO public 
WITH CHECK (true);

-- Olvasás engedélyezése a bejelentkezett felhasználóknak (admin, munkás)
CREATE POLICY "Enable read for authenticated users" 
ON public.reviews FOR SELECT TO authenticated 
USING (true);

-- RLS politika bővítése a projektek táblán:
-- Hogy a publikus értékelő oldal lekérhesse a projekt nevét bejelentkezés nélkül (anon)
CREATE POLICY "Enable read by ID for public anon users" 
ON public.projects FOR SELECT TO anon 
USING (true);
