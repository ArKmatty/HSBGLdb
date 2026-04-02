import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

const REGIONS = ['EU', 'US', 'AP', 'CN'];
const PAGES_TO_FETCH = 4;
const CN_API_BASE = 'https://webapi.blizzard.cn/hs-rank-api-server/api';
const CN_SEASON_ID = parseInt(process.env.CN_SEASON_ID || '17', 10);

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

async function fetchCnLeaderboard(page: number): Promise<Array<{ accountid: string; rating: number; rank: number }>> {
  const apiPage = ((page - 1) * 25) + 1;
  const res = await fetch(
    `${CN_API_BASE}/game/ranks?mode_name=battlegrounds&season_id=${CN_SEASON_ID}&page=${apiPage}&page_size=25`,
    { cache: 'no-store' }
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

    for (const region of REGIONS) {
      let regionPlayers: Array<{ accountid: string; rating: number; rank: number }> = [];

      if (region === 'CN') {
        const cnRequests = Array.from({ length: PAGES_TO_FETCH }, (_, i) => fetchCnLeaderboard(i + 1));
        const cnResults = await Promise.all(cnRequests);
        regionPlayers = cnResults.flat();
      } else {
        const pageRequests = Array.from({ length: PAGES_TO_FETCH }, (_, i) => {
          const page = i + 1;
          return fetch(`https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${page}`, {
            cache: 'no-store'
          }).then(res => res.json());
        });

        const results = await Promise.all(pageRequests);
        regionPlayers = results.flatMap(data => data.leaderboard?.rows || []);
      }

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

    if (allPlayersToInsert.length === 0) {
      return NextResponse.json({ success: false, error: '0 giocatori estratti. API non operante.' }, { status: 500 });
    }

    const { error } = await supabaseAdmin.from('leaderboard_history').insert(allPlayersToInsert);

    if (error) {
      console.error("[CRON JOB] Errore salvataggio bulk Supabase:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync Completato. Nuovi fotogrammi storici salvati: ${allPlayersToInsert.length}` 
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore interno';
    console.error("[CRON JOB] Errore fatale:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
