-- Napelemes projekt jelző mező hozzáadása
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS is_solar BOOLEAN DEFAULT false;
