import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://lnnkvqxvqhbdvsomdfyh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxubmt2cXh2cWhiZHZzb21kZnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDE1NzEsImV4cCI6MjA4OTY3NzU3MX0.hdUOH7iF-HmeafpK4Y-6cUMt6_CQKcmLWSMvlau507E');
const res = await supabase.from('payments').select('*, bills(bill_number, billing_period), profiles:resident_id(first_name, last_name, meter_number)').eq('status', 'pending');
console.log(JSON.stringify(res));
