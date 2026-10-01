import { createClient } from '@supabase/supabase-js';
const supabase = createClient('', '');
const res = await supabase.from('profiles').select('*').limit(1);
console.log(JSON.stringify(res.data[0]));
