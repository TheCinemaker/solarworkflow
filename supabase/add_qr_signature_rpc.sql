-- 1. Projekt nevének lekérdezése publikusan (csak a nevet adja vissza, biztonságosan)
CREATE OR REPLACE FUNCTION public.get_project_name_public(proj_id UUID)
RETURNS TEXT AS $$
  SELECT name FROM public.projects WHERE id = proj_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Aláírás beküldése publikusan (csak a megfelelő mezőket frissíti)
CREATE OR REPLACE FUNCTION public.submit_client_signature(
  proj_id UUID,
  sig TEXT,
  sig_name TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.projects
  SET 
    client_signature = sig,
    client_signature_name = sig_name,
    client_signature_date = now(),
    updated_at = now()
  WHERE id = proj_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Hozzáférések biztosítása az anonim (nem bejelentkezett) és a bejelentkezett felhasználóknak is
GRANT EXECUTE ON FUNCTION public.get_project_name_public(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_client_signature(UUID, TEXT, TEXT) TO anon, authenticated;
