import { supabase } from './supabase';
import { unstable_cache } from 'next/cache';

export const getTopMovers = unstable_cache(
  async (region: string = 'EU') => {
    // 24h fa
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Per ottimizzare senza RPC: estraiamo unicamente i rating delle ultime 24h 
    // e li calcoliamo lato server qui, dopodiché NEXTJS cacha il risultato per mezz'ora.
    const { data, error } = await supabase
      .from('leaderboard_history')
      .select('accountId, rating') // Usa la colonna esatta del DB che ha la "I" maiuscola
      .eq('region', region)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: true }); // dal più vecchio (ieri) al più recente (oggi)

    if (error || !data || data.length === 0) return [];

    // Mappa O(N) per trovare il primo e ultimo rating di ogni giocatore nelle ultime 24h
    const playerStats: Record<string, { firstRating: number; lastRating: number }> = {};

    for (const row of data) {
      const name = row.accountId;
      if (!playerStats[name]) {
        playerStats[name] = { firstRating: row.rating, lastRating: row.rating };
      } else {
        // sovrascrive ad ogni ciclo, così alla fine 'lastRating' conterrà veramente l'ultimo valore della giornata
        playerStats[name].lastRating = row.rating;
      }
    }

    // Calcoliamo la differenza (diff = finale - iniziale)
    const movers = Object.keys(playerStats).map(accountid => {
      const { firstRating, lastRating } = playerStats[accountid];
      const diff = lastRating - firstRating;
      return { accountid, diff, rating: lastRating };
    });

    // Filtriamo chi ha guadagnato, ordiniamo e prendiamo solo i Top 5
    return movers
      .filter(m => m.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 5);
  },
  ['top-movers-cache'], // base cache key
  { revalidate: 1800, tags: ['movers'] } // revalidate ogni 30 minuti (1800 secondi)
);
