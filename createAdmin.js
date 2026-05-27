import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://shighyqwnmubwhlcetvf.supabase.co';
const supabaseAnonKey = 'sb_publishable_9B8bw3NoQwUx9ed18XsNFQ_DL-viuFv';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@thecinemaker.hu',
    password: 'Nyanyuska:0169',
    options: {
      data: {
        full_name: 'TheCinemaker',
        role: 'admin'
      }
    }
  });

  if (error) {
    console.error('Hiba:', error.message);
  } else {
    console.log('Sikeresen létrehozva:', data.user.email);
  }
}

createAdmin();
