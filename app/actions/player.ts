"use server";
import { supabaseAdmin } from '@/lib/supabase';
import { getPlayerLiveStats } from '@/lib/blizzard';

/**
 * Retrieves player rating history from Supabase.
 * @param name - The player's account ID (battle tag)
 * @param region - Optional region filter (EU, US, AP, CN)
 * @param limit - Maximum number of records to return (default: 100)
 * @returns Object with success status and history array, or error message
 */
export async function getPlayerHistory(name: string, region?: string, limit = 100) {
  const start = Date.now();
  try {
    let query = supabaseAdmin
      .from('leaderboard_history')
      .select('rating, created_at, rank, region')
      .eq('accountId', name);

    if (region) {
      query = query.eq('region', region);
    }

    query = query.order('created_at', { ascending: true }).limit(limit);

    const { data: history, error: hError } = await query;

    if (hError) throw hError;

    console.log(`[Perf] History for ${name}${region ? ` (${region})` : ''} fetched in ${Date.now() - start}ms`);
    return { success: true, history: history || [] };
  } catch (error) {
    console.error("History Action Error:", error);
    return { success: false, error: "Database error" };
  }
}

/**
 * Search players by partial name match.
 * Returns distinct accountIds that contain the query string (case-insensitive).
 * @param query - The search query (minimum 2 characters)
 * @returns Array of matching account IDs (max 10 results)
 */
export async function searchPlayers(query: string) {
  if (!query || query.length < 2) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('leaderboard_history')
      .select('accountId')
      .ilike('accountId', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];

    const seen = new Set<string>();
    return data
      .map(d => d.accountId)
      .filter(name => {
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .slice(0, 10);
  } catch {
    return [];
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
