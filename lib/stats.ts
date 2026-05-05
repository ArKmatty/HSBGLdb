import { supabaseAdmin } from './supabase';
import { unstable_cache } from 'next/cache';

export interface HistoryPoint {
  mmr: number;
  date: string;
  timestamp: number;
  fullDate?: string;
  isLive?: boolean;
}

export interface PlayerStats {
  peak: number;
  games: number;
  gain7d: number;
}

/**
 * Compute player stats from history data
 */
export function computeStats(history: Array<{ rating: number; created_at: string }>): PlayerStats;
export function computeStats(history: HistoryPoint[]): PlayerStats;
export function computeStats(history: Array<{ rating?: number; mmr?: number; created_at?: string; fullDate?: string; timestamp?: number }>): PlayerStats {
  let peak = 0;
  let gamesCount = 0;
  
  for (let i = 0; i < history.length; i++) {
    const rating = history[i].rating ?? history[i].mmr ?? 0;
    if (rating > peak) peak = rating;
    if (i > 0 && rating !== (history[i - 1].rating ?? history[i - 1].mmr ?? 0)) gamesCount++;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recordsLast7Days = history.filter((h) => {
    const date = h.created_at ? new Date(h.created_at) : h.fullDate ? new Date(h.fullDate) : h.timestamp ? new Date(h.timestamp) : new Date(0);
    return date >= sevenDaysAgo;
  });
  const gain7d = recordsLast7Days.length > 0
    ? (history[history.length - 1].rating ?? history[history.length - 1].mmr ?? 0) - (recordsLast7Days[0].rating ?? recordsLast7Days[0].mmr ?? 0)
    : 0;

  return { peak, games: gamesCount, gain7d };
}

/**
 * Aggregate history data into time buckets to reduce noise
 */
export function bucketizeHistory(
  data: HistoryPoint[],
  timeRange: string,
  liveData?: { rating: number }
): HistoryPoint[] {
  const BUCKET_MS: Record<string, number> = {
    '24h': 2 * 60 * 60 * 1000,   // 2-hour buckets
    '7d': 6 * 60 * 60 * 1000,    // 6-hour buckets
    '30d': 24 * 60 * 60 * 1000,  // 1-day buckets
    'all': 72 * 60 * 60 * 1000,  // 3-day buckets
  };
  const bucketSize = BUCKET_MS[timeRange] || BUCKET_MS['all'];

  const aggregated: HistoryPoint[] = [];
  let bucketStart: number | null = null;
  let bucketPoints: HistoryPoint[] = [];

  for (const point of data) {
    if (bucketStart === null) {
      bucketStart = point.timestamp;
      bucketPoints = [point];
    } else if (point.timestamp - bucketStart < bucketSize) {
      bucketPoints.push(point);
    } else {
      const last = bucketPoints[bucketPoints.length - 1];
      aggregated.push(last);
      bucketStart = point.timestamp;
      bucketPoints = [point];
    }
  }
  
  if (bucketPoints.length > 0) {
    aggregated.push(bucketPoints[bucketPoints.length - 1]);
  }

  if (liveData && (aggregated.length === 0 || aggregated[aggregated.length - 1].mmr !== liveData.rating)) {
    aggregated.push({
      mmr: liveData.rating,
      date: 'LIVE',
      timestamp: Date.now(),
      isLive: true,
    });
  }

  // Filter out consecutive duplicate MMR values (but keep at least 2 points for graph)
  return aggregated.filter((point, i) => {
    if (i === 0) return true;
    if (aggregated.length - i === 1) return true;
    const prev = aggregated[i - 1];
    return point.mmr !== prev.mmr;
  });
}



/**
 * Fetch movers and fallers in a single query to avoid redundant database work
 * Returns both top gainers and top losers in one pass
 */
export const getMoversAndFallers = unstable_cache(
  async (region: string = 'EU') => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Single query to fetch all rating data from last 24h
    const { data, error } = await supabaseAdmin
      .from('leaderboard_history')
      .select('accountId, rating')
      .eq('region', region)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Movers] Error fetching data for', region, ':', error.message);
      return { movers: [], fallers: [] };
    }

    if (!data || data.length === 0) {
      console.log('[Movers] No history data for', region, 'in last 24h');
      return { movers: [], fallers: [] };
    }

    // Single pass to compute both first and last rating per player
    const playerStats: Record<string, { firstRating: number; lastRating: number }> = {};

    for (const row of data) {
      const name = row.accountId;
      if (!playerStats[name]) {
        playerStats[name] = { firstRating: row.rating, lastRating: row.rating };
      } else {
        playerStats[name].lastRating = row.rating;
      }
    }

    // Calculate deltas
    const players = Object.keys(playerStats).map(accountid => {
      const { firstRating, lastRating } = playerStats[accountid];
      const diff = lastRating - firstRating;
      return { accountid, diff, rating: lastRating };
    });

    // Log stats for debugging
    const moverCount = players.filter(m => m.diff > 0).length;
    const fallerCount = players.filter(m => m.diff < 0).length;
    console.log(`[Movers] ${region}: ${playerStats.length} players, ${moverCount} movers, ${fallerCount} fallers`);

    // Split into movers and fallers
    const movers = players
      .filter(m => m.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 5);

    const fallers = players
      .filter(m => m.diff < 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);

    return { movers, fallers };
  },
  ['movers-fallers-combined-cache'],
  { revalidate: 600, tags: ['movers', 'fallers'] } // 10 minutes
);
