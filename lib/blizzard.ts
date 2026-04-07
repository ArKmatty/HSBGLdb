import { supabaseAdmin } from './supabase';
import { ingestLeaderboardSnapshot } from './ingest';
import { unstable_cache } from 'next/cache';
import type { BlizzardLeaderboardRow, BlizzardLeaderboardData, BlizzardPlayerLive, CnLeaderboardResponse, LeaderboardHistoryRecord } from './types';

const REVALIDATE_SECONDS = 60;
const CACHE_LEADERBOARD_SECONDS = 180; // 3 minutes (reduced from 5min) - better balance of freshness vs performance
const CACHE_PLAYER_LIVE_SECONDS = 120;
const CN_API_BASE = 'https://webapi.blizzard.cn/hs-rank-api-server/api';
const CN_SEASON_ID = parseInt(process.env.CN_SEASON_ID || '17', 10);

// In-memory cache for player live stats to avoid redundant lookups within the cache window
// Key: lowercase player name, Value: { result, expiry }
const playerLiveCache = new Map<string, { result: BlizzardPlayerLive | null; expiry: number }>();
const PLAYER_LIVE_CACHE_TTL_MS = CACHE_PLAYER_LIVE_SECONDS * 1000;

// Cache durations (in seconds)
// - Leaderboard: 180s (3min) - balances freshness with TTFB performance
// - Player live stats: 120s (moderate freshness acceptable)
// - Top movers/fallers: 600s (10min, computed stats change slowly)

function isValidLeaderboardPage(data: unknown): data is BlizzardLeaderboardData {
  return typeof data === 'object' && data !== null;
}

/**
 * Fetch with exponential backoff retry
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retry attempts
 * @param label - Label for logging
 * @param baseDelay - Base delay in ms (default: 300ms)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  label: string = 'fetch',
  baseDelay: number = 300
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error as Error;
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`[${label}] Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, error);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`[${label}] Failed after ${maxRetries} attempts`);
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
    // CN: Fetch from database (populated by cron sync) instead of live API
    // This is more reliable as CN API often fails from Vercel
    
    // Get all CN players from the last 24 hours (latest snapshots)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dbPlayers, error: dbError } = await supabaseAdmin
      .from('leaderboard_history')
      .select('accountId, rating, rank, region, created_at')
      .eq('region', region)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });
    
    if (dbError) {
      console.error(`[Blizzard CN] Database error:`, dbError.message);
      return [];
    }
    
    // Deduplicate by accountId (keep latest entry per player)
    const latestMap = new Map<string, BlizzardLeaderboardRow>();
    for (const p of dbPlayers || []) {
      if (!latestMap.has(p.accountId)) {
        latestMap.set(p.accountId, {
          rank: p.rank,
          accountid: p.accountId,
          rating: p.rating,
        });
      }
    }
    
    // Sort by rating (descending) and assign proper ranks
    const currentPlayers = Array.from(latestMap.values())
      .sort((a, b) => b.rating - a.rating)
      .map((player, idx) => ({
        ...player,
        rank: idx + 1,
      }));

    // Paginate - show 100 players per page (matching non-CN regions)
    const pageSize = 100;
    const startIdx = (page - 1) * pageSize;
    const paginatedPlayers = currentPlayers.slice(startIdx, startIdx + pageSize);

    console.log(`[Blizzard CN] Fetched ${currentPlayers.length} unique players, showing page ${page} (${paginatedPlayers.length} players)`);

    if (paginatedPlayers.length === 0) return [];

    const playerNames = paginatedPlayers.map(p => p.accountid);

    // Retry snapshot query up to 3 times on failure
    let snapshots: Pick<LeaderboardHistoryRecord, 'accountId' | 'rating' | 'created_at' | 'region'>[] = [];
    let snapError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await supabaseAdmin
          .from('leaderboard_history')
          .select('accountId, rating, created_at, region')
          .in('accountId', playerNames)
          .eq('region', region)
          .lt('created_at', new Date().toISOString())
          .order('created_at', { ascending: true });
        
        snapshots = result.data || [];
        snapError = result.error;
        if (!snapError) break; // Success
      } catch (e) {
        console.warn(`[Blizzard CN] Snapshot query attempt ${attempt + 1} failed:`, e);
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    if (snapError) {
      console.error(`[Blizzard CN] Snapshot query error after retries:`, snapError.message);
    }
    console.log(`[Blizzard CN] Found ${snapshots?.length || 0} historical snapshots for ${playerNames.length} players`);

    // Get the OLDEST snapshot per player for trend calculation (within last 24h)
    // This matches the behavior of non-CN regions for consistency
    const oldestSnapshotMap = new Map<string, number>();
    for (const s of snapshots || []) {
      const key = s.accountId.toLowerCase();
      if (!oldestSnapshotMap.has(key)) {
        oldestSnapshotMap.set(key, s.rating);
      }
    }

    return paginatedPlayers.map(player => {
      const oldestRating = oldestSnapshotMap.get(player.accountid.toLowerCase());
      const lastRating = oldestRating !== undefined ? oldestRating : player.rating;
      return { ...player, lastRating };
    });
  }

  const pageSize = 10;
  const startPage = ((page - 1) * pageSize) + 1;

  const requests = Array.from({ length: pageSize }, (_, i) => {
    const apiPage = startPage + i;
    return fetchWithRetry(
      `https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${apiPage}`,
      { next: { revalidate: REVALIDATE_SECONDS } },
      3, // 3 retry attempts
      `[Blizzard ${region}] page ${apiPage}`
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
  async (name: string, preferredRegion?: string | null): Promise<BlizzardPlayerLive | null> => {
    // Check in-memory cache first
    const cacheKey = name.toLowerCase();
    const now = Date.now();
    const cached = playerLiveCache.get(cacheKey);
    if (cached && cached.expiry > now) {
      return cached.result;
    }

    const regions = ['EU', 'US', 'AP', 'CN'];
    const PREFERRED_PAGES = 10;
    const OTHER_PAGES = 3; // Reduced from 5: most players won't be in non-preferred regions

    // If no preferred region provided, try to get from recent history
    if (!preferredRegion) {
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
    }

    const orderedRegions = preferredRegion
      ? [preferredRegion, ...regions.filter(r => r !== preferredRegion)]
      : regions;

    for (const region of orderedRegions) {
      try {
        // CN uses a different API
        if (region === 'CN') {
          const cnPagesToScan = preferredRegion === 'CN' ? PREFERRED_PAGES : OTHER_PAGES;

          const cnRequests = Array.from({ length: cnPagesToScan }, (_, i) =>
            fetchWithRetry(
              `${CN_API_BASE}/game/ranks?mode_name=battlegrounds&season_id=${CN_SEASON_ID}&page=${i + 1}&page_size=25`,
              { next: { revalidate: REVALIDATE_SECONDS } },
              2, // 2 retry attempts for player search
              `[Blizzard CN player search] page ${i + 1}`
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
          fetchWithRetry(
            `https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${i + 1}`,
            { next: { revalidate: REVALIDATE_SECONDS } },
            2, // 2 retry attempts for player search
            `[Blizzard ${region} player search] page ${i + 1}`
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
          const result = { ...match, region };
          playerLiveCache.set(cacheKey, { result, expiry: now + PLAYER_LIVE_CACHE_TTL_MS });
          return result;
        }
      } catch (e) {
        console.error(`[Blizzard] Error scanning ${region}:`, e);
      }
    }

    playerLiveCache.set(cacheKey, { result: null, expiry: now + PLAYER_LIVE_CACHE_TTL_MS });
    return null;
  },
  ['player-live'],
  { revalidate: CACHE_PLAYER_LIVE_SECONDS, tags: ['player-live'] }
);
