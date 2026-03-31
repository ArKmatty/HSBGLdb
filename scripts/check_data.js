const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('leaderboard_history').select('*').limit(3);
  console.log("Error:", error);
  console.log("Data count:", data?.length);
  if (data && data.length > 0) {
    console.log("First row example:", data[0]);
  }
}
test();
