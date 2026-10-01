const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase
    .from('payments')
    .select('*, bills(bill_number, billing_period), profiles:resident_id(first_name, last_name, meter_number)')
    .eq('status', 'pending');
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
