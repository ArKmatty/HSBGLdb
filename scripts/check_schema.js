const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('leaderboard_history').select('*').limit(1);
  if (error) {
    console.log("Error querying table:", error);
  } else if (data && data.length > 0) {
    console.log("Columns are:", Object.keys(data[0]));
  } else {
    console.log("Table is empty, but query succeeded. Let's try inserting with account_id...");
    const { error: err2 } = await supabase.from('leaderboard_history').insert([{ account_id: 'Test', rating: 1000, rank: 1, region: 'EU' }]);
    if (err2) {
      console.log("Failed with account_id. Error:", err2.message);
      const { error: err3 } = await supabase.from('leaderboard_history').insert([{ accountId: 'Test', rating: 1000, rank: 1, region: 'EU' }]);
      if (err3) console.log("Failed with accountId. Error:", err3.message);
      else console.log("SUCCESS with accountId!");
    } else {
      console.log("SUCCESS with account_id!");
    }
  }
  process.exit(0);
}
test();
