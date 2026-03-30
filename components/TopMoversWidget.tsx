import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

interface Mover {
  accountid: string;
  diff: number;
  rating: number;
}

export default function TopMoversWidget({ players }: { players: Mover[] }) {
  if (!players || players.length === 0) return null;

  return (
    <div className="mb-8 w-full p-6 bg-slate-900/40 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400">
          <TrendingUp size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">Top 5 Movers (24h)</h2>
          <p className="text-xs text-blue-400 uppercase tracking-widest font-extrabold mt-1">
            Giocatori più in forma oggi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
        {players.map((p, index) => (
          <div key={p.accountid} className="relative group p-5 bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/50 hover:border-blue-400/50 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer text-center">
            <Link href={`/player/${p.accountid}`} className="absolute inset-0 z-10" />
            
            <div className={`
              absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-4 ring-slate-900
              ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-yellow-950' : 
                index === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800' : 
                index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100' : 'bg-slate-800 text-slate-400 border border-slate-600'}
            `}>
              {index + 1}
            </div>

            <div className="font-extrabold text-slate-200 truncate w-full text-lg group-hover:text-blue-400 transition-colors">
              {p.accountid}
            </div>
            
            <div className="mt-3 flex flex-col items-center">
              <span className="text-3xl font-black text-green-400 drop-shadow-md">+{p.diff}</span>
              <span className="text-xs text-slate-500 font-mono mt-1 font-semibold">{p.rating} MMR</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
