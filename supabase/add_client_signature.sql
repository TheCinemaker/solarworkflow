-- Digitális aláírás mezők hozzáadása a projektek táblához
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_signature TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_signature_date TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_signature_name TEXT;
