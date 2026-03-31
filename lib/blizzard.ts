import { supabase } from './supabase';
import { ingestLeaderboardSnapshot } from './ingest';

const REVALIDATE_SECONDS = 60;

export interface BlizzardLeaderboardRow {
  rank: number;
  accountid: string;
  rating: number;
  lastRating?: number;
}

export interface BlizzardLeaderboardPage {
  leaderboard?: {
    rows?: BlizzardLeaderboardRow[];
  };
}

export interface BlizzardPlayerLive extends BlizzardLeaderboardRow {
  region: string;
}

function isValidLeaderboardPage(data: unknown): data is BlizzardLeaderboardPage {
  return typeof data === 'object' && data !== null;
}

export async function getLeaderboard(region = 'EU', page = 1) {
  const VALID_REGIONS = ['EU', 'US', 'AP'] as const;
  if (!VALID_REGIONS.includes(region as typeof VALID_REGIONS[number])) {
    console.error(`[Blizzard] Invalid region: ${region}`);
    return [];
  }

  if (!Number.isInteger(page) || page < 1) {
    console.error(`[Blizzard] Invalid page: ${page}`);
    return [];
  }

  const pageSize = 10;
  const startPage = ((page - 1) * pageSize) + 1;

  const requests = Array.from({ length: pageSize }, (_, i) => {
    const apiPage = startPage + i;
    return fetch(
      `https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${apiPage}`,
      { next: { revalidate: REVALIDATE_SECONDS } }
    )
      .then(res => {
        if (!res.ok) {
          console.error(`[Blizzard] API error: ${res.status} for page ${apiPage}`);
          return { leaderboard: { rows: [] } };
        }
        return res.json();
      })
      .catch(err => {
        console.error(`[Blizzard] Fetch error for page ${apiPage}:`, err);
        return { leaderboard: { rows: [] } };
      });
  });

  const results = await Promise.all(requests);
  const currentPlayers = results
    .filter(isValidLeaderboardPage)
    .flatMap(data => data.leaderboard?.rows || []);

  if (currentPlayers.length === 0) return [];

  void ingestLeaderboardSnapshot(region, currentPlayers);

  const playerNames = currentPlayers.map(p => p.accountid);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: snapshots } = await supabase
    .from('leaderboard_history')
    .select('accountId, rating, created_at')
    .in('accountId', playerNames)
    .gte('created_at', yesterday)
    .order('created_at', { ascending: true });

  const snapshotMap = new Map<string, number>();
  for (const s of snapshots || []) {
    const key = s.accountId.toLowerCase();
    if (!snapshotMap.has(key)) {
      snapshotMap.set(key, s.rating);
    }
  }

  const playersWithTrend = currentPlayers.map(player => {
    const oldestRating = snapshotMap.get(player.accountid.toLowerCase());
    const lastRating = oldestRating !== undefined ? oldestRating : player.rating;
    return {
      ...player,
      lastRating,
    };
  });

  return playersWithTrend;
}

export async function getPlayerLiveStats(name: string): Promise<BlizzardPlayerLive | null> {
  const regions = ['EU', 'US', 'AP'];
  const PAGES_TO_SCAN = 8;

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

  const orderedRegions = preferredRegion
    ? [preferredRegion, ...regions.filter(r => r !== preferredRegion)]
    : regions;

  for (const region of orderedRegions) {
    try {
      const pageRequests = Array.from({ length: PAGES_TO_SCAN }, (_, i) =>
        fetch(
          `https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${i + 1}`,
          { next: { revalidate: REVALIDATE_SECONDS } }
        )
          .then(res => {
            if (!res.ok) return { leaderboard: { rows: [] } };
            return res.json();
          })
          .catch(() => ({ leaderboard: { rows: [] } }))
      );

      const pagesResults = await Promise.all(pageRequests);
      const rows = pagesResults.flatMap(d => d.leaderboard?.rows || []);
      const match = rows.find(
        (r: { accountid: string }) => r.accountid.toLowerCase() === name.toLowerCase()
      );

      if (match) {
        return { ...match, region };
      }
    } catch (e) {
      console.error(`[Blizzard] Error scanning ${region}:`, e);
    }
  }

  return null;
}
