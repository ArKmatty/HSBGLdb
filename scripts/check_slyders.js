require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('leaderboard_history')
    .select('*')
    .eq('accountId', 'Slyders');
  
  if (error) console.error("Error:", error);
  else {
    console.log(`Found ${data.length} records for Slyders:`);
    console.log(data);
  }
}
test();
