"use server";
import { supabase } from '@/lib/supabase';
import { getPlayerLiveStats } from '@/lib/blizzard';

/**
 * Recupera solo lo storico da Supabase (molto veloce)
 */
export async function getPlayerHistory(name: string) {
  const start = Date.now();
  try {
    const { data: history, error: hError } = await supabase
      .from('leaderboard_history')
      .select('rating, created_at, rank, region')
      .eq('accountId', name)
      .order('created_at', { ascending: true });

    if (hError) throw hError;

    console.log(`[Perf] History for ${name} fetched in ${Date.now() - start}ms`);
    return { success: true, history: history || [] };
  } catch (error) {
    console.error("History Action Error:", error);
    return { success: false, error: "Database error" };
  }
}

/**
 * Recupera lo stato live (più lento, orchestrando caching Blizzard)
 * e gestisce l'auto-snapshot.
 */
export async function getPlayerLive(name: string, lastHistoryRating?: number, lastHistoryDate?: string) {
  const start = Date.now();
  try {
    const live = await getPlayerLiveStats(name);
    console.log(`[Perf] Live scan for ${name} fetched/cached in ${Date.now() - start}ms`);

    // Auto-Snapshot Logic
    if (live) {
      const now = new Date();
      const lastTime = lastHistoryDate ? new Date(lastHistoryDate) : new Date(0);
      
      // Cooldown 5 minuti
      if (live.rating !== (lastHistoryRating || 0) && (now.getTime() - lastTime.getTime() > 300000)) {
         const { error: iError } = await supabase.from('leaderboard_history').insert([{
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
