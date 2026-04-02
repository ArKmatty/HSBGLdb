import { supabaseAdmin } from './supabase';

interface PlayerRow {
  accountid: string;
  rating: number;
  rank: number;
}

export interface IngestResult {
  success: boolean;
  inserted: number;
  error?: string;
}

export async function ingestLeaderboardSnapshot(region: string, players: PlayerRow[]): Promise<IngestResult> {
  const rows = players
    .filter(p => p && p.accountid)
    .map(p => ({
      accountId: p.accountid,
      rating: p.rating,
      rank: p.rank,
      region,
      created_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return { success: true, inserted: 0 };
  }

  try {
    const { error } = await supabaseAdmin
      .from('leaderboard_history')
      .insert(rows);

    if (error) {
      console.error(`[Ingest] Error inserting ${region}:`, error.message);
      return { success: false, inserted: 0, error: error.message };
    }

    console.log(`[Ingest] ${region}: ${rows.length} snapshots saved`);
    return { success: true, inserted: rows.length };
  } catch (err) {
    console.error(`[Ingest] Fatal error for ${region}:`, err);
    return { success: false, inserted: 0, error: 'Unknown error' };
  }
}
