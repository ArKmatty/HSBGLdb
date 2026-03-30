// lib/ingest.ts
// Smart background ingestion: salva snapshot in Supabase con cooldown per evitare duplicati
import { supabase } from './supabase';

// Cooldown in-memory per regione: evita inserimenti multipli su page-load ravvicinate
const lastIngestTime: Record<string, number> = {};
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minuti

interface PlayerRow {
  accountid: string;
  rating: number;
  rank: number;
}

/**
 * Fire-and-forget: inserisce i player in Supabase se il cooldown per la regione è scaduto.
 * Non blocca e non lancia errori (logga solo).
 */
export function backgroundIngest(region: string, players: PlayerRow[]) {
  const now = Date.now();
  const lastTime = lastIngestTime[region] || 0;

  // Cooldown: se abbiamo già inserito per questa regione da meno di 10 min, skip
  if (now - lastTime < COOLDOWN_MS) {
    return;
  }

  // Segniamo subito il timestamp per evitare race condition
  lastIngestTime[region] = now;

  const rows = players
    .filter(p => p && p.accountid)
    .map(p => ({
      accountId: p.accountid,
      rating: p.rating,
      rank: p.rank,
      region: region,
      created_at: new Date().toISOString()
    }));

  if (rows.length === 0) return;

  // Fire-and-forget: non attendiamo il risultato
  (async () => {
    try {
      const { error } = await supabase
        .from('leaderboard_history')
        .insert(rows);

      if (error) {
        console.error(`[Ingest] Errore inserimento ${region}:`, error.message);
        // Reset timestamp così si riprova al prossimo caricamento
        lastIngestTime[region] = 0;
      } else {
        console.log(`[Ingest] ${region}: ${rows.length} snapshot salvati (on-demand)`);
      }
    } catch (err) {
      console.error(`[Ingest] Errore fatale ${region}:`, err);
      lastIngestTime[region] = 0;
    }
  })();
}
