"use client";
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChevronLeft, TrendingUp, Trophy, Activity, Swords, Globe, AlertCircle, Loader2, Award, Tv } from 'lucide-react';
import Link from 'next/link';
import { getPlayerHistory, getPlayerLive } from '@/app/actions/player';
import { getTwitchStatusForPlayer } from '@/app/actions/twitch';
import { detectLocaleClient, translations } from '@/lib/i18n';

interface HistoryPoint {
  mmr: number;
  date: string;
  fullDate?: string;
  isLive?: boolean;
}

interface LiveData {
  rating: number;
  rank: number;
  region: string;
  accountid: string;
  [key: string]: unknown;
}

interface TwitchData {
  isLive: boolean;
  username: string;
  title?: string;
  viewerCount?: number;
}

export default function PlayerPage() {
  const { name } = useParams();
  const decodedName = decodeURIComponent(name as string);
  const [locale] = useState(() => detectLocaleClient());
  const t = translations[locale];
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [twitchData, setTwitchData] = useState<TwitchData | null>(null);
  const [stats, setStats] = useState({ peak: 0, games: 0, gain7d: 0 });
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingLive, setLoadingLive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Uniamo i dati per il grafico per mostrare la progressione in tempo reale
  const chartData = useMemo(() => {
    const data = [...historyData];
    if (liveData) {
      const lastHistoryPoint = data.length > 0 ? data[data.length - 1] : null;
      if (!lastHistoryPoint || lastHistoryPoint.mmr !== liveData.rating) {
        data.push({
          mmr: liveData.rating,
          date: 'LIVE',
          isLive: true
        });
      }
    }
    return data;
  }, [historyData, liveData]);

  // Gestione Ricerche Recenti
  useEffect(() => {
    if (decodedName) {
      const saved = localStorage.getItem('recentSearches');
      let recent = saved ? JSON.parse(saved) : [];
      recent = [decodedName, ...recent.filter((n: string) => n !== decodedName)].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(recent));
    }
  }, [decodedName]);

  useEffect(() => {
    async function fetchAll() {
      setLoadingHistory(true);
      setLoadingLive(true);
      setError(null);
      
      let lastRating = 0;
      let lastDate = "";

      // 1. Carica lo Storico PRIMA (molto veloce)
      try {
        const hResult = await getPlayerHistory(decodedName);
        if (hResult.success && hResult.history) {
          const history = hResult.history;
          const formatted = history.map((h: { rating: number; created_at: string }) => ({
            mmr: h.rating,
            date: new Date(h.created_at).toLocaleTimeString(detectLocaleClient() === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
            fullDate: h.created_at
          }));
          setHistoryData(formatted);

          if (history.length > 0) {
            const last = history[history.length - 1];
            lastRating = last.rating;
            lastDate = last.created_at;
          }

          // Calcolo Statistiche
          let peak = 0;
          let gamesCount = 0;
          for (let i = 0; i < history.length; i++) {
            if (history[i].rating > peak) peak = history[i].rating;
            if (i > 0 && history[i].rating !== history[i-1].rating) gamesCount++;
          }

          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recordsLast7Days = history.filter((h: { created_at: string }) => new Date(h.created_at) >= sevenDaysAgo);
          const gain7d = recordsLast7Days.length > 0 
            ? history[history.length - 1].rating - recordsLast7Days[0].rating 
            : 0;

          setStats({ peak, games: gamesCount, gain7d });
        } else if (!hResult.success) {
            setError(hResult.error || t.databaseError);
        }
      } catch (err) {
        console.error("History fetch error:", err);
      } finally {
        setLoadingHistory(false);
      }

      // 2. Carica il dato Live in background
      try {
        const lResult = await getPlayerLive(decodedName, lastRating, lastDate);
        if (lResult.success && lResult.live) {
          setLiveData(lResult.live);
        }
      } catch (err) {
        console.error("Live fetch error:", err);
      } finally {
        setLoadingLive(false);
      }

      // 3. Carica i dati Twitch (Lato Server)
      try {
         const tData = await getTwitchStatusForPlayer(decodedName);
         if (tData) {
            setTwitchData(tData);
         }
      } catch (e) {
        console.error("Twitch server fetch error:", e);
      }
    }
    
    fetchAll();
  }, [decodedName]);

  const isNewPeak = (liveData?.rating ?? 0) > stats.peak && stats.peak > 0;

  return (
    <main className="min-h-screen bg-slate-1000 p-6 md:p-12 text-white selection:bg-blue-500/30 font-sans antialiased bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
      <div className="max-w-6xl mx-auto">
        
        {/* TWITCH LIVE ALERT */}
        {twitchData?.isLive && (
          <div className="mb-8 p-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-700 relative z-50">
            <div className="bg-slate-950 rounded-[calc(1rem-1px)] p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.5)]">
                       <Tv className="text-white" size={24} />
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-slate-950"></span>
                    </span>
                 </div>
                 <div>
                    <h3 className="font-black text-lg leading-tight uppercase tracking-tighter italic">{t.liveTwitchNow}</h3>
                    <p className="text-slate-400 text-xs font-bold line-clamp-1 max-w-md">{twitchData.title}</p>
                 </div>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-center md:text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{t.viewers}</p>
                    <p className="text-sm font-black text-white">{twitchData.viewerCount?.toLocaleString() || '0'}</p>
                 </div>
                 <a 
                   href={`https://twitch.tv/${twitchData.username}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_20px_rgba(147,51,234,0.3)] hover:-translate-y-0.5 no-underline flex items-center gap-2"
                 >
                    {t.watchStream}
                 </a>
              </div>
            </div>
          </div>
        )}

        <Link href="/" className="inline-flex items-center text-slate-500 hover:text-white mb-10 transition-colors font-medium group no-underline">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="ml-1">{t.backToLeaderboard}</span>
        </Link>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 px-2">
          <div className="flex items-center gap-8">
            <div className="p-6 bg-slate-900 rounded-[2rem] border border-blue-500/20 shadow-2xl relative group overflow-hidden">
               <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <TrendingUp className="text-blue-400 relative z-10" size={48} />
            </div>
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white">
                  {decodedName}
                </h1>
                {liveData ? (
                  <span className="flex items-center gap-2 px-4 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full text-xs font-black uppercase tracking-[0.1em] shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Live
                  </span>
                ) : (loadingLive && !loadingHistory) && (
                  <span className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-full text-xs font-black uppercase tracking-[0.1em]">
                     <Loader2 size={12} className="animate-spin" /> {t.liveSync}
                  </span>
                )}
              </div>
              <p className="text-slate-500 uppercase tracking-[0.3em] text-[11px] font-black flex items-center gap-3">
                 {t.bgStats}
                {liveData && (
                  <>
                    <span className="w-1.5 h-1.5 bg-slate-800 rounded-full"></span>
                    <span className="flex items-center gap-1.5 text-slate-400"><Globe size={14} className="text-blue-500/40" /> {liveData.region} Global Rank #{liveData.rank}</span>
                  </>
                )}
                {twitchData?.username && (
                   <>
                    <span className="w-1.5 h-1.5 bg-slate-800 rounded-full"></span>
                    <a 
                      href={`https://twitch.tv/${twitchData.username}`} 
                      target="_blank" 
                      className="flex items-center gap-1.5 text-purple-400 font-black hover:text-purple-300 no-underline"
                    >
                      <Tv size={14} /> twitch.tv/{twitchData.username}
                    </a>
                   </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end min-h-[100px] justify-end relative">
            {isNewPeak && (
              <div className="absolute -top-6 right-0 flex items-center gap-1 text-yellow-500 text-[10px] font-black uppercase tracking-widest">
                < Award size={12} /> {t.newPeak}
              </div>
            )}
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.25em] mb-2 opacity-60">{t.currentScore}</p>
            <div className="flex items-baseline gap-3">
              <p className={`text-6xl md:text-7xl font-black transition-all duration-300 ${liveData ? 'text-blue-400' : 'text-slate-800'}`}>
                {(liveData?.rating || stats.peak || 0).toLocaleString()}
              </p>
              <span className="text-3xl font-black text-slate-600 mb-1">MMR</span>
            </div>
          </div>
        </div>

        {/* DASHBOARD STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[t.historicalPeak, t.trend7d, t.matchesAnalyzed].map((title, i) => {
             const icons = [<Trophy key="t" size={32} />, <Activity key="a" size={32} />, <Swords key="s" size={32} />];
             const values = [
               stats.peak || (liveData ? liveData.rating : '-'),
               `${stats.gain7d > 0 ? '+' : ''}${stats.gain7d}`,
               stats.games
             ];
             const colors = ['text-yellow-500', stats.gain7d >= 0 ? 'text-green-400' : 'text-red-400', 'text-purple-400'];
             const bgColors = ['bg-yellow-500/10', stats.gain7d >= 0 ? 'bg-green-500/10' : 'bg-red-500/10', 'bg-purple-500/10'];
             
             return (
               <div key={title} className="group bg-slate-900 border border-white/[0.05] p-10 rounded-[3rem] flex items-center gap-8 shadow-2xl transition-all duration-300 hover:bg-slate-800 hover:-translate-y-1">
                 <div className={`p-5 ${bgColors[i]} ${colors[i]} rounded-[1.5rem] border border-white/5`}>
                   {icons[i]}
                 </div>
                 <div>
                   <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] mb-2">{title}</p>
                   {loadingHistory ? (
                     <div className="h-10 w-24 bg-slate-800/50 animate-pulse rounded-xl"></div>
                   ) : (
                     <p className={`text-4xl font-black tracking-tight ${i === 1 ? colors[i] : 'text-white'}`}>
                       {typeof values[i] === 'number' ? (values[i] as number).toLocaleString() : values[i]}
                     </p>
                   )}
                 </div>
               </div>
             );
          })}
        </div>

        {/* CHART SECTION */}
        <div className="bg-slate-900 p-10 md:p-14 rounded-[4rem] border border-white/[0.08] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden isolate">
          <div className="h-[520px] w-full relative z-10">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 45 }}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={25}
                    fontFamily="inherit"
                    fontWeight={700}
                    letterSpacing="0.05em"
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    dx={-20}
                    fontFamily="inherit"
                    fontWeight={700}
                    tickFormatter={(val) => val.toLocaleString()}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#070c1c', 
                      border: '1px solid rgba(59, 130, 246, 0.4)', 
                      borderRadius: '1.5rem',
                      padding: '20px',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
                    }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                    itemStyle={{ color: '#3b82f6', fontWeight: '900', fontSize: '1.6rem' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.2em' }}
                    formatter={(value: unknown) => [`${(value as number).toLocaleString()}`, t.rating]}
                  />
                  <Area 
                    type="stepAfter" 
                    dataKey="mmr" 
                    stroke="#3b82f6" 
                    strokeWidth={6} 
                    fillOpacity={1} 
                    fill="#3b82f640" 
                    isAnimationActive={false} // PRESTAZIONI MASSIME
                    dot={(props: any) => {
                      if (props.payload.isLive) {
                        return (
                          <g key={`live-dot-${props.cx}`}>
                            <circle cx={props.cx} cy={props.cy} r={8} fill="#3b82f6" stroke="#fff" strokeWidth={4} />
                          </g>
                        );
                      }
                      return null;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : loadingHistory ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                <p className="mt-6 text-slate-500 font-black uppercase tracking-[0.3em] text-xs">{t.searchingHistory}</p>
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-700 bg-slate-950 border border-white/[0.05] rounded-[4rem] p-16 text-center group/empty transition-all duration-300 hover:bg-slate-900">
                    <div className="p-10 bg-slate-900 rounded-full mb-8 shadow-2xl relative">
                    <Activity size={56} className="text-blue-500/30 group-hover:text-blue-500/60 transition-colors" />
                    </div>
                    <p className="font-black uppercase tracking-[0.25em] text-2xl text-slate-400 mb-3">{t.incompleteData}</p>
                    <p className="text-base text-slate-600 max-w-sm leading-relaxed font-medium">
                    {t.incompleteDataDesc}
                    </p>
                    {loadingLive && <Loader2 className="mt-10 w-8 h-8 animate-spin text-blue-500/40" />}
                </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}