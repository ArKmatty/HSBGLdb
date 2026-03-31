
async function test() {
  const region = 'US';
  const page = 1;
  const pageSize = 4;
  const startPage = ((page - 1) * pageSize) + 1;
  
  const requests = Array.from({ length: pageSize }, (_, i) => {
    const apiPage = startPage + i;
    return fetch(`https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${apiPage}`)
      .then(res => res.json());
  });

  const results = await Promise.all(requests);
  const currentPlayers = results.flatMap(data => data.leaderboard?.rows || []);

  console.log("Total players:", currentPlayers.length);
  if (currentPlayers.length > 0) {
    console.log("First player:", currentPlayers[0].rank, currentPlayers[0].accountid);
    console.log("50th player:", currentPlayers[49].rank, currentPlayers[49].accountid);
    console.log("51st player:", currentPlayers[50].rank, currentPlayers[50].accountid);
  }
}
test();
