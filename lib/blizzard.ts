import { supabaseAdmin } from './supabase';
import { ingestLeaderboardSnapshot } from './ingest';
import { unstable_cache } from 'next/cache';
import type { BlizzardLeaderboardRow, BlizzardLeaderboardData, BlizzardPlayerLive, CnLeaderboardResponse } from './types';

const REVALIDATE_SECONDS = 60;
const CACHE_LEADERBOARD_SECONDS = 60;
const CACHE_PLAYER_LIVE_SECONDS = 120;
const CN_API_BASE = 'https://webapi.blizzard.cn/hs-rank-api-server/api';
const CN_SEASON_ID = parseInt(process.env.CN_SEASON_ID || '17', 10);

function isValidLeaderboardPage(data: unknown): data is BlizzardLeaderboardData {
  return typeof data === 'object' && data !== null;
}

async function getCnLeaderboard(page: number): Promise<BlizzardLeaderboardRow[]> {
  const pageSize = 10;
  const startPage = ((page - 1) * pageSize) + 1;

  const requests = Array.from({ length: pageSize }, (_, i) => {
    const apiPage = startPage + i;
    return fetch(
      `${CN_API_BASE}/game/ranks?mode_name=battlegrounds&season_id=${CN_SEASON_ID}&page=${apiPage}&page_size=25`,
      { next: { revalidate: REVALIDATE_SECONDS } }
    )
      .then(async res => {
        if (!res.ok) {
          console.error(`[Blizzard CN] API error: ${res.status} for page ${apiPage}`);
          return { code: 0, message: '', data: { list: [], total: 0 } };
        }
        return res.json() as Promise<CnLeaderboardResponse>;
      })
      .catch(err => {
        console.error(`[Blizzard CN] Fetch error for page ${apiPage}:`, err);
        return { code: 0, message: '', data: { list: [], total: 0 } };
      });
  });

  const results = await Promise.all(requests);
  const players: BlizzardLeaderboardRow[] = results
    .flatMap(r => r.data?.list || [])
    .map((item) => ({
      rank: item.position,
      accountid: item.battle_tag,
      rating: item.score,
    }));

  return players;
}

export const getLeaderboard = unstable_cache(
  async (region = 'EU', page = 1) => {
    const VALID_REGIONS = ['EU', 'US', 'AP', 'CN'] as const;
    if (!VALID_REGIONS.includes(region as typeof VALID_REGIONS[number])) {
      console.error(`[Blizzard] Invalid region: ${region}`);
      return [];
    }

    if (!Number.isInteger(page) || page < 1) {
      console.error(`[Blizzard] Invalid page: ${page}`);
      return [];
    }

    // Fetch from single region
    const players = await fetchRegionLeaderboard(region, page);
    console.log(`[Blizzard] Cached leaderboard for ${region} page ${page}: ${players.length} players`);
    return players;
  },
  ['leaderboard-cache'],
  { revalidate: CACHE_LEADERBOARD_SECONDS, tags: ['leaderboard'] }
);

/**
 * Fetch leaderboard from multiple regions combined
 */
export const getMultiRegionLeaderboard = unstable_cache(
  async (regions: string[], page = 1) => {
    if (!Array.isArray(regions) || regions.length === 0) {
      return [];
    }

    const allPlayers = await Promise.all(
      regions.map(region => fetchRegionLeaderboard(region, page))
    );

    // Flatten and combine results
    const combined = allPlayers.flat();

    // Re-sort by rank across regions
    return combined.sort((a, b) => a.rank - b.rank);
  },
  ['multiregion-leaderboard-cache'],
  { revalidate: CACHE_LEADERBOARD_SECONDS, tags: ['leaderboard', 'multiregion'] }
);

/**
 * Fetch leaderboard from a single region
 */
async function fetchRegionLeaderboard(region: string, page: number): Promise<BlizzardLeaderboardRow[]> {
  const VALID_REGIONS = ['EU', 'US', 'AP', 'CN'] as const;
  if (!VALID_REGIONS.includes(region as typeof VALID_REGIONS[number])) {
    console.error(`[Blizzard] Invalid region: ${region}`);
    return [];
  }

  if (!Number.isInteger(page) || page < 1) {
    console.error(`[Blizzard] Invalid page: ${page}`);
    return [];
  }

  console.log(`[Blizzard] Fetching ${region} page ${page}...`);

  if (region === 'CN') {
    const currentPlayers = await getCnLeaderboard(page);
    if (currentPlayers.length === 0) return [];

    void ingestLeaderboardSnapshot(region, currentPlayers);

    const playerNames = currentPlayers.map(p => p.accountid);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: snapshots } = await supabaseAdmin
      .from('leaderboard_history')
      .select('accountId, rating, created_at, region')
      .in('accountId', playerNames)
      .eq('region', region)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: true });

    const snapshotMap = new Map<string, number>();
    for (const s of snapshots || []) {
      const key = s.accountId.toLowerCase();
      if (!snapshotMap.has(key)) {
        snapshotMap.set(key, s.rating);
      }
    }

    return currentPlayers.map(player => {
      const oldestRating = snapshotMap.get(player.accountid.toLowerCase());
      const lastRating = oldestRating !== undefined ? oldestRating : player.rating;
      return { ...player, lastRating };
    });
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
  const { data: snapshots } = await supabaseAdmin
    .from('leaderboard_history')
    .select('accountId, rating, created_at, region')
    .in('accountId', playerNames)
    .eq('region', region)
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

  const minRank = Math.min(...playersWithTrend.map(p => p.rank));
  const maxRank = Math.max(...playersWithTrend.map(p => p.rank));
  console.log(`[Blizzard] ${region} page ${page}: ${playersWithTrend.length} players (ranks ${minRank}-${maxRank})`);

  return playersWithTrend;
}

export const getPlayerLiveStats = unstable_cache(
  async (name: string): Promise<BlizzardPlayerLive | null> => {
    const regions = ['EU', 'US', 'AP', 'CN'];
    const PREFERRED_PAGES = 10;
    const OTHER_PAGES = 5;

    let preferredRegion: string | null = null;
    try {
      const { data: history } = await supabaseAdmin
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
        // CN uses a different API
        if (region === 'CN') {
          const cnPageSize = 10;
          const cnPagesToScan = preferredRegion === 'CN' ? PREFERRED_PAGES : OTHER_PAGES;
          
          const cnRequests = Array.from({ length: cnPagesToScan }, (_, i) =>
            fetch(
              `${CN_API_BASE}/game/ranks?mode_name=battlegrounds&season_id=${CN_SEASON_ID}&page=${i + 1}&page_size=25`,
              { next: { revalidate: REVALIDATE_SECONDS } }
            )
              .then(res => {
                if (!res.ok) return { code: 0, message: '', data: { list: [], total: 0 } };
                return res.json() as Promise<CnLeaderboardResponse>;
              })
              .catch(() => ({ code: 0, message: '', data: { list: [], total: 0 } }))
          );

          const cnResults = await Promise.all(cnRequests);
          const allPlayers = cnResults.flatMap(r => r.data?.list || []);
          const match = allPlayers.find(p => p.battle_tag.toLowerCase() === name.toLowerCase());

          if (match) {
            return {
              rank: match.position,
              accountid: match.battle_tag,
              rating: match.score,
              region: 'CN',
            };
          }
          continue;
        }

        // EU, US, AP use standard Blizzard API
        const pagesToScan = region === preferredRegion ? PREFERRED_PAGES : OTHER_PAGES;
        const pageRequests = Array.from({ length: pagesToScan }, (_, i) =>
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
          (r: BlizzardLeaderboardRow) => r.accountid.toLowerCase() === name.toLowerCase()
        );

        if (match) {
          return { ...match, region };
        }
      } catch (e) {
        console.error(`[Blizzard] Error scanning ${region}:`, e);
      }
    }

    return null;
  },
  ['player-live'],
  { revalidate: CACHE_PLAYER_LIVE_SECONDS, tags: ['player-live'] }
);
