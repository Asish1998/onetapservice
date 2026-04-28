import { createClient } from '@supabase/supabase-js';

const supabaseUrl =  'https://ldgbpxixrqlsfmbgsfgn.supabase.co';
const supabaseAnonKey =  'sb_publishable_nC_2wgrhXPyaZuvfhj8wyg_GiLKoRWI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
