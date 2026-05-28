import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = 'https://shighyqwnmubwhlcetvf.supabase.co';
const supabaseAnonKey = 'sb_publishable_9B8bw3NoQwUx9ed18XsNFQ_DL-viuFv';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  global: {
    headers: {},
  },
  realtime: {
    transport: ws,
  },
});

async function check() {
  console.log('--- PROFILES ---');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) console.error(pErr);
  else console.log(profiles);

  console.log('--- WORKLOGS ---');
  const { data: logs, error: lErr } = await supabase.from('worklogs').select('*, profiles(full_name)');
  if (lErr) console.error(lErr);
  else console.log(logs);
}

check();
