const { createClient } = require('@supabase/supabase-js');

// Configura il client Supabase manuale
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function injectFakeHistory() {
  console.log("Iniezioni cronologia fittizia...");
  const players = [
    { name: 'Slyders', baseRating: 18000, region: 'EU' },
    { name: 'jeef', baseRating: 19500, region: 'US' },
    { name: 'XQN', baseRating: 17500, region: 'EU' }
  ];

  const fakeRows = [];
  const now = new Date();

  // Create fake records for the last 5 days
  for (let daysAgo = 5; daysAgo > 0; daysAgo--) {
    const historicalDate = new Date(now);
    historicalDate.setDate(now.getDate() - daysAgo);

    players.forEach(p => {
      // Add random rating gain (+50 to +300) to base rating
      const ratingGain = Math.floor(Math.random() * 250) + 50;
      fakeRows.push({
        accountId: p.name,
        rating: p.baseRating + ratingGain * (6 - daysAgo),
        rank: Math.floor(Math.random() * 10) + 1,
        region: p.region,
        created_at: historicalDate.toISOString()
      });
    });
  }

  const { error } = await supabase.from('leaderboard_history').insert(fakeRows);
  if (error) {
    console.error("Errore inserimento:", error);
  } else {
    console.log("Inseriti 15 record storici fake con successo!");
  }
}

injectFakeHistory();
