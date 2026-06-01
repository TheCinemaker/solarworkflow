-- Új telefonszám mezők hozzáadása a projektek táblához
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS client_phone_2 TEXT,
ADD COLUMN IF NOT EXISTS client_phone_3 TEXT;

COMMENT ON COLUMN public.projects.client_phone IS 'Elsődleges telefonszám';
COMMENT ON COLUMN public.projects.client_phone_2 IS 'Másodlagos telefonszám (opcionális)';
COMMENT ON COLUMN public.projects.client_phone_3 IS 'Harmadlagos telefonszám (opcionális)';
