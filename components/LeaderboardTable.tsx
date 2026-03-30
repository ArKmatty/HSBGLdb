"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Minus, Tv } from "lucide-react";

interface Player {
  rank: number;
  accountid: string;
  rating: number;
  lastRating?: number;
}

export default function LeaderboardTable({ players, twitchStatuses = {} }: { players: Player[], twitchStatuses?: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  // Effetto per il Real-Time: ricarica i dati dal server ogni 2 minuti
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 120000);

    return () => clearInterval(interval);
  }, [router]);

  if (!players || players.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500 font-bold uppercase tracking-widest text-xs">
        Nessun orma di vita trovata.
      </div>
    );
  }

  const filteredPlayers = players.filter((player) =>
    player.accountid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full">
      {/* Barra di ricerca */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Cerca giocatore nella pagina..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-5 bg-slate-900/50 border border-white/5 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all shadow-2xl backdrop-blur-sm"
        />
      </div>

      <div className="flex justify-between items-end mb-4 px-1">
        <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
          Mostrando {filteredPlayers.length} giocatori
        </div>
        <div className="flex items-center gap-2">
           <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black opacity-60">Sincronizzazione Live</span>
        </div>
      </div>

      <div className="overflow-x-auto shadow-2xl rounded-[1.5rem] border border-white/[0.05] bg-slate-900/50 relative isolate">
        <table className="min-w-full text-white">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-6 py-5 text-left font-black text-slate-500 text-[10px] uppercase tracking-widest">Rank</th>
              <th className="px-6 py-5 text-left font-black text-slate-500 text-[10px] uppercase tracking-widest">Giocatore</th>
              <th className="px-6 py-5 text-left font-black text-slate-500 text-[10px] uppercase tracking-widest">MMR</th>
              <th className="px-6 py-5 text-center font-black text-slate-500 text-[10px] uppercase tracking-widest">Trend</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => {
              const diff = player.lastRating ? player.rating - player.lastRating : 0;
              const twitchData = twitchStatuses[player.accountid.toLowerCase()];
              const isLiveOnTwitch = twitchData?.isLive;

              return (
                <tr key={player.rank} className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5 font-black text-yellow-500/60 tabular-nums">#{player.rank}</td>
                  
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Link 
                        href={`/player/${player.accountid}`} 
                        className="text-slate-200 font-bold hover:text-blue-400 transition-all no-underline"
                      >
                        {player.accountid}
                      </Link>
                      {isLiveOnTwitch && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-600/20 border border-purple-500/30 rounded-md animate-pulse">
                           <Tv size={10} className="text-purple-400" />
                           <span className="text-[8px] font-black text-purple-400 uppercase tracking-tighter">Live</span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-5 text-blue-400 font-black tabular-nums">{player.rating.toLocaleString()}</td>
                  
                  <td className="px-6 py-5 text-center">
                    <div className="flex justify-center items-center gap-1">
                      {diff > 0 ? (
                        <div className="flex items-center text-green-500 font-black gap-1">
                          <TrendingUp size={16} />
                          <span className="text-[11px]">+{diff}</span>
                        </div>
                      ) : diff < 0 ? (
                        <div className="flex items-center text-red-500 font-black gap-1">
                          <TrendingDown size={16} />
                          <span className="text-[11px]">{diff}</span>
                        </div>
                      ) : (
                        <Minus size={16} className="text-slate-800" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}