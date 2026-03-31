const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { error } = await supabase.from('leaderboard_history').insert([
    { accountid: 'TEST_ACCOUNT', rating: 1000, rank: 9999, region: 'EU' }
  ]);
  console.log("Error?", error);
  process.exit(0);
}
test();
