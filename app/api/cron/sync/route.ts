import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// Configuriamo le impostazioni della Batch-Job
const REGIONS = ['EU', 'US', 'AP'];
const PAGES_TO_FETCH = 4; // Ogni pagina ha 25 elementi (quindi 4 pagine = Top 100 per regione)

export async function GET(request: Request) {

  // ATTENZIONE: In produzione su Vercel de-commenta queste righe per sicurezza 
  // usando un Vercel Cron Secret environment variable.
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const allPlayersToInsert: any[] = [];

    // Loop sequenziale per sicurezza (evitare rate-limiting) o Parallelo se le api lo reggono. 
    // Usiamo fetch in parallelo per le singole pagine della regione, mentre le regioni vanno una alla volta
    for (const region of REGIONS) {
      
      const pageRequests = Array.from({ length: PAGES_TO_FETCH }, (_, i) => {
        const page = i + 1;
        // Non usiamo next.revalidate perché è un job schedulato e vogliamo dati puri live
        return fetch(`https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData?region=${region}&leaderboardId=battlegrounds&page=${page}`, {
          cache: 'no-store'
        }).then(res => res.json());
      });

      const results = await Promise.all(pageRequests);
      const regionPlayers = results.flatMap(data => data.leaderboard?.rows || []);

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

    // Effettuiamo un unico inserimento MASSIVO in Supabase (~300 records in totale in un unico round-trip)
    const { error } = await supabase.from('leaderboard_history').insert(allPlayersToInsert);

    if (error) {
      console.error("[CRON JOB] Errore salvataggio bulk Supabase:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync Completato. Nuovi fotogrammi storici salvati: ${allPlayersToInsert.length}` 
    });

  } catch (error: any) {
    console.error("[CRON JOB] Errore fatale:", error);
    return NextResponse.json({ success: false, error: error.message || 'Errore interno' }, { status: 500 });
  }
}
