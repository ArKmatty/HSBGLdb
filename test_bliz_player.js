async function testPlayerSearch(name) {
  const regions = ['EU', 'US', 'AP'];
  for (const region of regions) {
    const url = `https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&search=${encodeURIComponent(name)}`;
    console.log(`Checking ${region}...`);
    try {
      const res = await fetch(url);
      const data = await res.json();
      const player = data.leaderboard?.rows?.find(r => r.accountid.toLowerCase() === name.toLowerCase());
      if (player) {
        console.log(`FOUND in ${region}:`, player);
        return;
      }
    } catch (e) {
      console.log(`Error in ${region}:`, e.message);
    }
  }
  console.log("Not found in any region.");
}

testPlayerSearch('Rdu');
