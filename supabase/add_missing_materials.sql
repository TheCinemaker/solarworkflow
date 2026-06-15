-- Adjuk hozzá a 'missing_materials' mezőt a projektek táblához
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS missing_materials TEXT;

-- Komment a mezőhöz
COMMENT ON COLUMN public.projects.missing_materials IS 'Hiányzó anyagok és egyéb akadályok leírása a projekten.';
