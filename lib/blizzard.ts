// lib/blizzard.ts
import { supabase } from './supabase';
import { backgroundIngest } from './ingest';

const REVALIDATE_SECONDS = 60; // 1 minuto come richiesto

export async function getLeaderboard(region = 'EU', page = 1) {
  const pageSize = 20;
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

  // 1b. On-demand ingestion: salva snapshot in background (fire-and-forget, cooldown 10min)
  backgroundIngest(region, currentPlayers);

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
 * Finds a player's live stats by scanning Blizzard leaderboards.
 * Strategy: check Supabase for last-known region first, scan that region first,
 * then fall back to scanning remaining regions only if not found.
 */
export async function getPlayerLiveStats(name: string) {
  const regions = ['EU', 'US', 'AP'];
  const PAGES_TO_SCAN = 8;

  // Check Supabase for player's last-known region
  let preferredRegion: string | null = null;
  try {
    const { data: history } = await supabase
      .from('leaderboard_history')
      .select('region')
      .eq('accountId', name)
      .order('created_at', { ascending: false })
      .limit(1);
    if (history?.[0]?.region) {
      preferredRegion = history[0].region;
    }
  } catch {
    // Ignore — fall back to default order
  }

  // Order regions: preferred first, then the rest
  const orderedRegions = preferredRegion
    ? [preferredRegion, ...regions.filter(r => r !== preferredRegion)]
    : regions;

  // Scan regions sequentially — stop as soon as we find the player
  for (const region of orderedRegions) {
    try {
      const pageRequests = Array.from({ length: PAGES_TO_SCAN }, (_, i) =>
        fetch(`https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${i + 1}`, { next: { revalidate: REVALIDATE_SECONDS } })
          .then(res => res.json())
          .catch(() => ({ leaderboard: { rows: [] } }))
      );

      const pagesResults = await Promise.all(pageRequests);
      const rows = pagesResults.flatMap(d => d.leaderboard?.rows || []);
      const match = rows.find((r: { accountid: string }) => r.accountid.toLowerCase() === name.toLowerCase());

      if (match) {
        return { ...match, region };
      }
    } catch (e) {
      console.error(`Error scanning ${region}:`, e);
    }
  }

  return null;
}