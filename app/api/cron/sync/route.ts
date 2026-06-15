import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { revalidateTag } from 'next/cache';

export const maxDuration = 300;

const REGIONS = ['EU', 'US', 'AP', 'CN'];
const PAGES_TO_FETCH = 20; // 20 pages × 25 players = 500 players per region
const CN_API_BASE = 'https://webapi.blizzard.cn/hs-rank-api-server/api';
const CN_SEASON_ID = parseInt(process.env.CN_SEASON_ID || '19', 10);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;
const INSERT_BATCH_SIZE = 250;
const SUPABASE_TIMEOUT_MS = 15_000;
const INSERT_MAX_RETRIES = 2;

interface CnLeaderboardResponse {
  code: number;
  message: string;
  data: {
    list: Array<{
      position: number;
      battle_tag: string;
      score: number;
    }>;
    total: number;
  };
}

/**
 * Fetch with exponential backoff retry for cron job reliability
 */
async function fetchWithRetry(url: string, options: RequestInit, label: string, maxRetries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error as Error;
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[${label}] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[${label}] Failed after ${maxRetries} attempts:`, lastError);
  return { ok: false, status: 0 } as Response;
}

type PlayerRow = { accountId: string; rating: number; rank: number; region: string; created_at: string };

async function insertWithRetry(
  rows: PlayerRow[],
  label: string,
  maxRetries = INSERT_MAX_RETRIES
): Promise<{ error: unknown }> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        supabaseAdmin.from('leaderboard_history').insert(rows),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase insert timeout')), SUPABASE_TIMEOUT_MS)
        ),
      ]) as { error: unknown | null };
      if (!result.error) return { error: null };
      lastError = result.error;
    } catch (error) {
      lastError = error;
    }
    const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
    console.warn(`[${label}] Insert retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(`[${label}] Insert failed after ${maxRetries} attempts:`, lastError);
  return { error: lastError };
}

async function insertInBatches(
  rows: PlayerRow[],
  label: string
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;
  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
    const { error } = await insertWithRetry(batch, `${label} batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1}`);
    if (error) {
      errors += batch.length;
      console.error(`[${label}] Batch failed:`, error);
    } else {
      inserted += batch.length;
    }
  }
  return { inserted, errors };
}

async function fetchCnLeaderboard(page: number): Promise<Array<{ accountid: string; rating: number; rank: number }>> {
  const apiPage = ((page - 1) * 25) + 1;
  const res = await fetchWithRetry(
    `${CN_API_BASE}/game/ranks?mode_name=battlegrounds&season_id=${CN_SEASON_ID}&page=${apiPage}&page_size=25`,
    { cache: 'no-store' },
    `CN Sync page ${apiPage}`
  );

  if (!res.ok) {
    console.error(`[CN Sync] API error: ${res.status} for page ${apiPage}`);
    return [];
  }

  const json = await res.json() as CnLeaderboardResponse;
  return (json.data?.list || []).map(item => ({
    accountid: item.battle_tag,
    rating: item.score,
    rank: item.position,
  }));
}

export async function GET(request: Request) {

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const allPlayersToInsert: Array<{ accountId: string; rating: number; rank: number; region: string; created_at: string }> = [];
    const syncStats: Record<string, { fetched: number; errors: number }> = {};

    for (const region of REGIONS) {
      let regionPlayers: Array<{ accountid: string; rating: number; rank: number }> = [];
      syncStats[region] = { fetched: 0, errors: 0 };

      if (region === 'CN') {
        const cnRequests = Array.from({ length: PAGES_TO_FETCH }, (_, i) => fetchCnLeaderboard(i + 1));
        const cnResults = await Promise.all(cnRequests);
        regionPlayers = cnResults.flat();
      } else {
        const pageRequests = Array.from({ length: PAGES_TO_FETCH }, (_, i) => {
          const page = i + 1;
          return fetchWithRetry(
            `https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${page}`,
            { cache: 'no-store' },
            `${region} Sync page ${page}`
          ).then(res => {
            if (!res.ok) {
              syncStats[region].errors++;
              return { leaderboard: { rows: [] } };
            }
            return res.json();
          });
        });

        const results = await Promise.all(pageRequests);
        regionPlayers = results.flatMap(data => data.leaderboard?.rows || []);
      }

      syncStats[region].fetched = regionPlayers.length;

      regionPlayers.forEach(p => {
        if (p && p.accountid) {
          allPlayersToInsert.push({
            accountId: p.accountid,
            rating: p.rating,
            rank: p.rank,
            region: region,
            created_at: new Date().toISOString()
          });
        }
      });
    }

    console.log('[CRON JOB] Sync stats:', JSON.stringify(syncStats));

    if (allPlayersToInsert.length === 0) {
      return NextResponse.json({ success: false, error: '0 giocatori estratti. API non operante.' }, { status: 500 });
    }

    const playersByRegion = new Map<string, PlayerRow[]>();
    for (const p of allPlayersToInsert) {
      if (!playersByRegion.has(p.region)) playersByRegion.set(p.region, []);
      playersByRegion.get(p.region)!.push(p);
    }

    let totalInserted = 0;
    let totalErrors = 0;
    const regionResults: Record<string, { inserted: number; errors: number }> = {};

    const insertPromises = Array.from(playersByRegion.entries()).map(async ([region, players]) => {
      const result = await insertInBatches(players, `${region} sync`);
      return { region, result };
    });

    const insertResults = await Promise.all(insertPromises);
    for (const { region, result } of insertResults) {
      regionResults[region] = result;
      totalInserted += result.inserted;
      totalErrors += result.errors;
    }

    if (totalInserted === 0) {
      console.error('[CRON JOB] No rows inserted at all, Supabase likely unreachable');
      return NextResponse.json({
        success: false,
        warning: 'Supabase unreachable, data will sync on next run',
        syncStats,
        regionResults,
      }, { status: 200 });
    }

    // Cleanup old rows (keep only last 30 days) to prevent database bloat
    // Runs every sync but is non-critical - will retry on next run if it fails
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: oldRowCount } = await Promise.race([
        supabaseAdmin.from('leaderboard_history').select('id', { count: 'exact', head: true }).lt('created_at', cutoff),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Cleanup count timeout')), 10_000)
        ),
      ]) as { count: number | null };

      if (oldRowCount && oldRowCount > 0) {
        await Promise.race([
          supabaseAdmin.from('leaderboard_history').delete().lt('created_at', cutoff),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Cleanup delete timeout')), 30_000)
          ),
        ]);
        console.log(`[CRON JOB] Cleanup: removed ${oldRowCount} rows older than 30 days`);
      }
    } catch (err) {
      console.warn('[CRON JOB] Cleanup failed (non-critical, will retry next run):', err);
    }

    // Revalidate all cache tags so next request fetches fresh data
    revalidateTag('leaderboard', { expire: 0 });
    revalidateTag('multiregion', { expire: 0 });
    revalidateTag('movers', { expire: 0 });
    revalidateTag('fallers', { expire: 0 });
    revalidateTag('player-live', { expire: 0 });

    return NextResponse.json({
      success: true,
      message: `Sync Completato. Righe salvate: ${totalInserted}, Errori: ${totalErrors}`,
      syncStats,
      regionResults,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore interno';
    console.error("[CRON JOB] Errore fatale:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
