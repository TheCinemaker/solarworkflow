# SECURITY_FIX_PLAN.md — Biztonsági audit javítási terv

Ez a dokumentum a Solar Workflow alkalmazás biztonsági réseinek kijavítására szolgáló ütemterv és dokumentáció.

---

## 1. Áttekintés (Sorrend és Ütemezés)

A sebezhetőségeket az alábbi szigorú sorrendben javítjuk, hogy elkerüljük az adminisztrátorok kizárását és az alkalmazás működésének megszakadását:

1. **Lépés 0 (Pre-flight)**: Előellenőrző SQL futtatása a Supabase-en (a felhasználó végzi).
2. **Lépés 1 (Kliens - UserContext)**: Hardkódolt e-mail-alapú admin jogok megszüntetése, átállás DB-alapú szerepkör-lekérdezésre.
3. **Lépés 2 (SQL - Lock profiles.role)**: `profiles.role` módosításának korlátozása (nem-admin userek kizárása az UPDATE-ből).
4. **Lépés 3 (SQL - handle_new_user trigger)**: Trigger fix, hogy a regisztráció során ne lehessen tetszőleges role-t megadni a metadatában.
5. **Lépés 4 (Kézi - Signups OFF)**: A felhasználó letiltja az e-mail-alapú nyilvános regisztrációt a Supabase felületén.
6. **Lépés 5 (SQL - Task toggle RPC)**: RPC létrehozása a taskok váltására, mert a szigorú RLS után a worker közvetlenül nem módosíthatja a projektet.
7. **Lépés 6 (Kliens - ProjectDetails toggle fix)**: Kliens kód átírása, hogy a checkbox váltásakor az RPC-t hívja a közvetlen UPDATE helyett.
8. **Lépés 7 (SQL - Tighten projects/worklogs/media/messages RLS)**: Szigorú RLS bevezetése. Admin-only projects módosítás, own-user-only insert worklogs/media/messages táblákra.
9. **Lépés 8 (Kliens - safeUrl.js és XSS védelem)**: Helper létrehozása az URL-sémák ellenőrzésére és alkalmazása a Telegram és média linkeken.
10. **Lépés 9 (Kliens - NewWorkerModal PII)**: Személyes adatok (PII) kiszervezése az Auth metadata helyett a `profiles` táblába történő közvetlen INSERT/UPDATE hívásba.
11. **Lépés 10 (SQL & Kliens - Sensitive Columns)**: Oszlop szintű hozzáférés-korlátozás az érzékeny adatokra (`inverter_api_key`, PII adatok). Kliens oldali `select('*')` cseréje explicit oszloplistára.
12. **Lépés 11 (Build & Teszt)**: Helyi build ellenőrzése és smoke tesztelés.

---

## 2. Pre-flight checklist (Lépés 0)

> [!IMPORTANT]
> **Kedves Felhasználó!** Kérlek, mielőtt bármilyen kódmódosítást jóváhagynál, futtasd le az alábbi SQL query-t a Supabase SQL Editorában, hogy ellenőrizd vagy beállítsd az admin fiókok szerepkörét. Ez elengedhetetlen ahhoz, hogy ne zárd ki magad az alkalmazásból!

```sql
-- 1. Ellenőrizzük, hogy az admin fiókok léteznek-e a profiles táblában, és 'admin' a szerepkörük:
SELECT p.id, u.email, p.role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email IN ('admin@voltdesk.hu', 'avar.szilveszter@gmail.com');

-- 2. Ha valamelyik HIÁNYZIK vagy NEM 'admin', javítsuk ki:
UPDATE public.profiles SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('admin@voltdesk.hu', 'avar.szilveszter@gmail.com')
);

-- 3. Ha a profile sor maga teljesen hiányozna valamelyiküknél:
INSERT INTO public.profiles (id, full_name, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), 'admin'
FROM auth.users
WHERE email IN ('admin@voltdesk.hu', 'avar.szilveszter@gmail.com')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

---

## 3. Manuális lépések a felhasználónak (Manual Steps)

A következő lépésekhez a Supabase Dashboard felületére van szükség, így ezeket neked kell elvégezned:

1. **Nyilvános regisztráció kikapcsolása**:
   - Supabase Dashboard → Authentication → Settings.
   - Kapcsold ki az **"Enable email signups"** opciót (állítsd `OFF`-ra).
   - Ezzel megelőzhető, hogy illetéktelenek fiókot hozzanak létre.
2. **Storage Bucket biztonsági beállításai (Phase 2)**:
   - Supabase Dashboard → Storage → `project-photos` bucket → Settings.
   - Kapcsold ki a **"Public bucket"** opciót (`OFF`).
   - Adj meg policies-t: adminoknak minden engedélyezett, workereknek csak az `{auth.uid()}/` kezdetű mappába való `INSERT`.

---

## 4. Fájlonkénti változtatások (File-by-file changes)

### SQL Migrációk (helyileg a `supabase/migrations/` mappába kerülnek)

#### 1. [NEW] `20260601_01_lock_role_column.sql`
- **Cél**: A `profiles.role` mező írásának korlátozása nem-admin userek számára.
- **Leírás**: Megvonja a `role` oszlop UPDATE jogát az `authenticated` szerepkörtől, és a RLS UPDATE policy-hoz hozzáad egy `WITH CHECK` záradékot, ami csak akkor engedi a módosítást, ha a felhasználó admin, vagy ha a módosítani kívánt `role` megegyezik a DB-ben már meglévő `role`-jával (azaz nem változik).

#### 2. [NEW] `20260601_02_fix_new_user_trigger.sql`
- **Cél**: Új userek regisztrációjakor a role alapértelmezetten mindig `'worker'` legyen.
- **Leírás**: Újraírja a `handle_new_user()` függvényt, hogy figyelmen kívül hagyja a `raw_user_meta_data->>'role'` értéket. Minden új regisztrált fixen `'worker'` szerepkört kap.

#### 3. [NEW] `20260601_05_toggle_task_rpc.sql`
- **Cél**: Taskok státuszának váltásához (pipálás) szükséges RPC definiálása.
- **Leírás**: Létrehoz egy `SECURITY DEFINER` típusú Postgres függvényt `toggle_project_task` néven, amit a worker meghívhat a befejezett taskok tömbjének frissítésére.

#### 4. [NEW] `20260601_03_tighten_projects_rls.sql` és `20260601_04_tighten_worklogs_media_messages_rls.sql`
- **Cél**: projects tábla módosításainak admin-only-vá tétele, és a többi tábla írásának saját felhasználóhoz kötése.
- **Leírás**:
  - `projects`: INSERT/UPDATE/DELETE korlátozása adminokra.
  - `worklogs`, `media`, `messages`: INSERT csak úgy lehetséges, ha a `user_id` megegyezik a bejelentkezett felhasználó ID-jával (`auth.uid()`).

#### 5. [NEW] `20260601_06_protect_sensitive_columns.sql`
- **Cél**: Érzékeny oszlopok és személyes adatok elrejtése a workerek elől.
- **Leírás**:
  - Korlátozza a `profiles` tábla lekérdezhetőségét: a workerek csak a saját soraikat láthatják.
  - Létrehoz egy `profiles_public` nevű VIEW-t a közös adatok (név, sorszám, munkakör) eléréséhez.
  - Megvonja a select jogot a projects.inverter_api_key oszlopról a nem-adminoktól, és létrehoz egy RPC-t (`get_inverter_api_key`) az adminnak a kulcs elérésére.

### Kliens-oldali JS/JSX módosítások

#### 6. [MODIFY] [UserContext.jsx](file:///Users/thecinemaker/.gemini/antigravity/scratch/villanyszerelo_munkalap/solar-workflow/src/context/UserContext.jsx)
- **Változás**: E-mail hardkódok törlése. A `role` értékét tisztán az adatbázis `profiles.role` mezőjéből olvassuk. Ezzel a DB lesz az egyedüli igazságforrás.

#### 7. [NEW] [safeUrl.js](file:///Users/thecinemaker/.gemini/antigravity/scratch/villanyszerelo_munkalap/solar-workflow/src/lib/safeUrl.js)
- **Változás**: XSS helper a linkek szűrésére. Csak biztonságos protokollokat engedélyez (`http:`, `https:`, `tel:`, `mailto:`), kiszűri a `javascript:` URL-eket.

#### 8. [MODIFY] [ProjectDetails.jsx](file:///Users/thecinemaker/.gemini/antigravity/scratch/villanyszerelo_munkalap/solar-workflow/src/pages/ProjectDetails.jsx) és [Issues.jsx](file:///Users/thecinemaker/.gemini/antigravity/scratch/villanyszerelo_munkalap/solar-workflow/src/pages/Issues.jsx)
- **Változás**:
  - A task checkbox váltásakor közvetlen UPDATE helyett az új `toggle_project_task` RPC-t hívja.
  - A Telegram és média linkeket átfuttatja a `safeUrl()` helperen.
  - A `select('*')` lekérdezések cseréje explicit oszloplistára.
  - Eltávolítja a worker és admin közötti `updated_at` redundáns realtime bökési hívását.

#### 9. [MODIFY] [NewWorkerModal.jsx](file:///Users/thecinemaker/.gemini/antigravity/scratch/villanyszerelo_munkalap/solar-workflow/src/components/NewWorkerModal.jsx)
- **Változás**: A dolgozó létrehozásakor a PII adatok (bankszámla, TAJ, adószám, munkabér stb.) nem kerülnek be az `signUp` metadata-jába, hanem a sikeres regisztráció után egy külön, admin-only UPDATE hívással mentődnek a `profiles` táblába.

---

## 5. Kockázati napló & Visszaállítási terv (Risk Register & Rollback)

| Lépés | Lehetséges kockázat | Hatás | Megelőzés / Visszaállítási terv (Rollback) |
|---|---|---|---|
| **Lépés 1: UserContext** | Nem egyezik meg az admin DB role-ja, kizáródik az admin. | Magas | A Lépés 0 SQL futtatása elengedhetetlen. Rollback: e-mail hardkód visszaállítása a kódban. |
| **Lépés 2: profiles.role lock** | Admin sem tud dolgozót létrehozni vagy szerkeszteni. | Közepes | Az admin `is_admin()` policy engedi az írást. Rollback: `GRANT UPDATE (role) ON public.profiles TO authenticated;` |
| **Lépés 5 & 6: Task toggle RPC** | A dolgozók nem tudják a taskokat kipipálni. | Magas | RPC-t a 03 RLS szigorítás előtt futtatjuk le és élesítjük a kódba. Rollback: DB RPC törlése, JS visszaállítása. |
| **Lépés 7: projects RLS** | Dolgozók nem látják a projekteket vagy összeomlik a lekérdezés. | Magas | SELECT policy továbbra is `USING(true)`. Csak az írást szigorítjuk. Rollback: RLS kikapcsolása vagy `USING(true)` visszaállítása. |
| **Lépés 10: Érzékeny oszlopok** | A `select('*')` lekérdezések hibát dobnak a PostgREST-ben a korlátozott oszlopok miatt. | Magas | A JS kódokat **előzetesen** átírjuk explicit oszloplistára. Rollback: oszlop szintű select jogok visszaadása. |

---

## 6. Phase 2 — Out of scope (Storage & Realtime)

A biztonságos storage bucket és a realtime payload szűkítése a Phase 2 keretében valósul meg, a user kifejezett kérésére:
- **Storage Policies**: A bucket priváttá tétele és a letöltésekhez a `supabase.storage.from(...).createSignedUrl()` használata.
- **Realtime Row Filters**: A PostgreSQL publication szintű szűrése, hogy a kliensek ne kapják meg a le nem kérdezhető sorok realtime frissítéseit sem.

---

## 7. Nyitott kérdések (Open Questions)

- [x] **A `profiles` táblának megvannak már a szükséges oszlopai?** Igen, a `supabase/add_serial_numbers.sql` fájl alapján a táblához már hozzá lett adva a `tax_id`, `tb_number`, `bank_account`, `id_card_number`, `emergency_phone`, `job_title`, és `hourly_wage` oszlopok.
