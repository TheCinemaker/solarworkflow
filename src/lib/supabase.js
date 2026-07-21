import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://shighyqwnmubwhlcetvf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9B8bw3NoQwUx9ed18XsNFQ_DL-viuFv'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

