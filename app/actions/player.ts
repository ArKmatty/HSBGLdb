"use server";
import { supabaseAdmin } from '@/lib/supabase';
import { getPlayerLiveStats } from '@/lib/blizzard';

/**
 * Retrieves player rating history from Supabase.
 * @param name - The player's account ID (battle tag)
 * @param region - Optional region filter (EU, US, AP, CN)
 * @param limit - Maximum number of records to return (default: 100)
 * @param timeRange - Optional time range to optimize limit ('24h', '7d', '30d', 'all')
 * @returns Object with success status and history array, or error message
 */
export async function getPlayerHistory(name: string, region?: string, limit = 100, timeRange?: string) {
  const start = Date.now();
  
  // Dynamic limit based on time range to avoid over-fetching
  const limitsByRange: Record<string, number> = {
    '24h': 30,   // ~1 record per hour
    '7d': 100,   // ~14 records per day
    '30d': 200,  // ~7 records per day
    'all': 500,  // Full history
  };
  const actualLimit = timeRange ? (limitsByRange[timeRange] || limit) : limit;
  
  try {
    let query = supabaseAdmin
      .from('leaderboard_history')
      .select('rating, created_at, rank, region')
      .eq('accountId', name);

    if (region) {
      query = query.eq('region', region);
    }

    query = query.order('created_at', { ascending: true }).limit(actualLimit);

    const { data: history, error: hError } = await query;

    if (hError) throw hError;

    console.log(`[Perf] History for ${name}${region ? ` (${region})` : ''} [${timeRange || 'default'}] fetched ${history?.length || 0} rows in ${Date.now() - start}ms`);
    return { success: true, history: history || [] };
  } catch (error) {
    console.error("History Action Error:", error);
    return { success: false, error: "Database error" };
  }
}

/**
 * Search players by partial name match.
 * Returns distinct accountIds with their latest rating that contain the query string (case-insensitive).
 * @param query - The search query (minimum 3 characters)
 * @returns Array of objects with accountId and rating (max 10 results)
 */
export async function searchPlayers(query: string) {
  if (!query || query.length < 3) return { success: true, players: [] as Array<{ accountId: string; rating: number }> };
  try {
    // The trigram index on accountId makes the ILIKE filter efficient
    // Fetch up to 100 rows to ensure we get 10 unique players (accounts for duplicates in history)
    const { data, error } = await supabaseAdmin
      .from('leaderboard_history')
      .select('accountId, rating, created_at')
      .ilike('accountId', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error("[SearchPlayers] Supabase error:", error.message);
      return { success: false, error: "Search failed" };
    }

    // Deduplicate client-side: keep only the most recent entry per player
    const seen = new Map<string, { accountId: string; rating: number }>();

    for (const d of data || []) {
      const key = d.accountId.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { accountId: d.accountId, rating: d.rating });
        if (seen.size >= 10) break;
      }
    }

    const results = Array.from(seen.values());

    // Sort by MMR descending when there's no clear match
    results.sort((a, b) => b.rating - a.rating);

    return { success: true, players: results };
  } catch (e) {
    console.error("[SearchPlayers] Unexpected error:", e);
    return { success: false, error: "Search failed" };
  }
}

/**
 * Retrieves live player stats from Blizzard API with auto-snapshot functionality.
 * Saves a snapshot to history if rating changed and cooldown period passed.
 * @param name - The player's account ID (battle tag)
 * @param lastHistoryRating - Optional last known rating for snapshot comparison
 * @param lastHistoryDate - Optional last snapshot date for cooldown check
 * @param region - Optional preferred region to search first (prevents region collision)
 * @returns Object with success status and live player data, or error message
 */
export async function getPlayerLive(name: string, lastHistoryRating?: number, lastHistoryDate?: string, region?: string | null) {
  const start = Date.now();
  try {
    const live = await getPlayerLiveStats(name, region);
    console.log(`[Perf] Live scan for ${name} fetched/cached in ${Date.now() - start}ms`);

    // Auto-Snapshot Logic
    if (live) {
      const now = new Date();
      const lastTime = lastHistoryDate ? new Date(lastHistoryDate) : new Date(0);
      
      // Cooldown 5 minuti
      if (live.rating !== (lastHistoryRating || 0) && (now.getTime() - lastTime.getTime() > 300000)) {
         const { error: iError } = await supabaseAdmin.from('leaderboard_history').insert([{
           accountId: live.accountid,
           rating: live.rating,
           rank: live.rank,
           region: live.region,
           created_at: now.toISOString()
         }]);
         if (!iError) console.log(`[Perf] Auto-Snapshot saved for ${name}`);
      }
    }

    return { success: true, live };
  } catch (error) {
    console.error("Live Action Error:", error);
    return { success: false, error: "Live data unavailable" };
  }
}
