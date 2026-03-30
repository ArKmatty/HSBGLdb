// lib/blizzard.ts
import { supabase } from './supabase';

const REVALIDATE_SECONDS = 60; // 1 minuto come richiesto

export async function getLeaderboard(region = 'EU', page = 1) {
  const pageSize = 4;
  const startPage = ((page - 1) * pageSize) + 1;
  
  // 1. Scarichiamo i dati freschi da Blizzard (Sfruttando Next Data Cache)
  const requests = Array.from({ length: pageSize }, (_, i) => {
    const apiPage = startPage + i;
    return fetch(`https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${apiPage}`, { next: { revalidate: REVALIDATE_SECONDS } })
      .then(res => res.json());
  });

  const results = await Promise.all(requests);
  const currentPlayers = results.flatMap(data => data.leaderboard?.rows || []);

  if (currentPlayers.length === 0) return [];

  // 2. Recuperiamo l'ultimo salvataggio dal DB per Trend
  const playerNames = currentPlayers.map(p => p.accountid);
  const { data: lastSnapshots } = await supabase
    .from('leaderboard_history')
    .select('accountId, rating, created_at')
    .in('accountId', playerNames)
    .order('created_at', { ascending: false });

  // 3. Uniamo i dati
  const playersWithTrend = currentPlayers.map(player => {
    const previousRecord = lastSnapshots?.find(s => s.accountId === player.accountid && s.rating !== player.rating);
    return {
      ...player,
      lastRating: previousRecord ? previousRecord.rating : player.rating
    };
  });
  
  return playersWithTrend;
}

/**
 * Scansiona i primi 200 giocatori (8 pagine da 25) in ogni regione.
 * La cache di Next.js farà sì che le prime 4 pagine siano condivise con la home (se entro 60s).
 */
export async function getPlayerLiveStats(name: string) {
  const regions = ['EU', 'US', 'AP'];
  const PAGES_TO_SCAN = 8; // Top 200 come richiesto
  
  // Scansione parallela per ogni regione
  const results = await Promise.all(regions.map(async (region) => {
    try {
      const pageRequests = Array.from({ length: PAGES_TO_SCAN }, (_, i) => 
        fetch(`https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${i + 1}`, { next: { revalidate: REVALIDATE_SECONDS } })
          .then(res => res.json())
          .catch(() => ({ leaderboard: { rows: [] } }))
      );

      const pagesResults = await Promise.all(pageRequests);
      const rows = pagesResults.flatMap(d => d.leaderboard?.rows || []);
      const match = rows.find((r: any) => r.accountid.toLowerCase() === name.toLowerCase());
      
      return match ? { ...match, region } : null;
    } catch (e) {
      console.error(`Error scanning ${region}:`, e);
      return null;
    }
  }));

  return results.find(r => r !== null) || null;
}