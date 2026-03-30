import Link from 'next/link';
import { getLeaderboard } from '../lib/blizzard';
import { getTopMovers } from '../lib/stats';
import LeaderboardTable from '../components/LeaderboardTable';
import TopMoversWidget from '../components/TopMoversWidget';
import RecentSearches from '../components/RecentSearches';
import { getTwitchStatusesForLeaderboard } from './actions/twitch';

export default async function Home({ searchParams }: { searchParams: Promise<{ region?: string, page?: string }> }) {
  const params = await searchParams;
  const region = (params.region || 'EU').toUpperCase();
  const currentPage = parseInt(params.page || '1');

  // Recuperiamo i dati passandogli la regione e la pagina specifica in parallelo con i Top Movers
  const [players, topMovers] = await Promise.all([
    getLeaderboard(region, currentPage),
    getTopMovers(region)
  ]);

  // Recuperiamo gli stati Twitch per i player in pagina (Lato Server)
  const playerIds = players.map(p => p.accountid);
  const twitchStatuses = await getTwitchStatusesForLeaderboard(playerIds);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold mb-6">Hearthstone Battlegrounds</h1>
          
          {/* Selettore Regione */}
          <div className="flex justify-center gap-4 mb-8">
            {['EU', 'US', 'AP'].map((r) => (
              <Link key={r} href={`/?region=${r}&page=1`} className={`px-4 py-2 rounded-full ${region === r ? 'bg-blue-600' : 'bg-slate-800'}`}>
                {r}
              </Link>
            ))}
          </div>
        </header>
        
        <RecentSearches />
        <TopMoversWidget players={topMovers} />
        <LeaderboardTable players={players} twitchStatuses={twitchStatuses} />

        {/* Frecce di Navigazione */}
        <div className="flex justify-center items-center gap-6 mt-8">
          {currentPage > 1 && (
            <Link href={`/?region=${region}&page=${currentPage - 1}`} className="px-6 py-2 bg-slate-800 rounded hover:bg-slate-700">
              ← Precedente
            </Link>
          )}
          <span className="text-slate-400 font-mono text-lg">Pagina {currentPage}</span>
          <Link href={`/?region=${region}&page=${currentPage + 1}`} className="px-6 py-2 bg-slate-800 rounded hover:bg-slate-700">
            Successiva →
          </Link>
        </div>
      </div>
    </main>
  );
}