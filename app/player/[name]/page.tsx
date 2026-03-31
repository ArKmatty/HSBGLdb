"use client";
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChevronLeft, TrendingUp, Trophy, Activity, Swords, Globe, AlertCircle, Loader2, Award, Tv } from 'lucide-react';
import Link from 'next/link';
import { getPlayerHistory, getPlayerLive } from '@/app/actions/player';
import { getTwitchStatusForPlayer } from '@/app/actions/twitch';
import { detectLocaleClient, translations } from '@/lib/i18n';
import ScrollToTop from '@/components/ScrollToTop';
import SocialLinksForm from '@/components/SocialLinksForm';
import PlayerCompare from '@/components/PlayerCompare';
import AchievementBadges from '@/components/AchievementBadges';

type TimeRange = '24h' | '7d' | '30d' | 'all';

interface HistoryPoint {
  mmr: number;
  date: string;
  timestamp: number;
  fullDate?: string;
  isLive?: boolean;
}

interface LiveData {
  rating: number;
  rank: number;
  region: string;
  accountid: string;
}

interface TwitchData {
  isLive: boolean;
  username: string;
  title?: string;
  viewerCount?: number;
}

function formatXAxisDate(timestamp: number, range: TimeRange, locale: string): string {
  const d = new Date(timestamp);
  if (range === '24h') {
    return d.toLocaleTimeString(locale === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '7d') {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US', { weekday: 'short' });
  }
  return d.toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipDate(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleString(locale === 'it' ? 'it-IT' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'All' },
];

const RANGE_MS: Record<TimeRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  'all': Infinity,
};

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
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const chartData = useMemo(() => {
    const cutoff = timeRange === 'all' ? 0 : Date.now() - RANGE_MS[timeRange];
    const filtered = historyData.filter(h => h.timestamp >= cutoff);
    if (liveData && (filtered.length === 0 || filtered[filtered.length - 1].mmr !== liveData.rating)) {
      filtered.push({
        mmr: liveData.rating,
        date: 'LIVE',
        timestamp: Date.now(),
        isLive: true,
      });
    }
    return filtered;
  }, [historyData, liveData, timeRange]);

  const xAxisTicks = useMemo(() => {
    const maxTicks = 6;
    const data = chartData.filter(d => !d.isLive);
    if (data.length <= maxTicks) return data.map(d => d.timestamp);
    const step = Math.ceil(data.length / maxTicks);
    const ticks: number[] = [];
    for (let i = 0; i < data.length; i += step) {
      ticks.push(data[i].timestamp);
    }
    if (ticks[ticks.length - 1] !== data[data.length - 1].timestamp) {
      ticks.push(data[data.length - 1].timestamp);
    }
    return ticks;
  }, [chartData]);

  const localeStr = locale === 'it' ? 'it-IT' : 'en-US';

  useEffect(() => {
    async function fetchAll() {
      setLoadingHistory(true);
      setLoadingLive(true);
      setError(null);
      
      let lastRating = 0;
      let lastDate = "";
      let playerRegion: string | undefined;

      try {
        const lResult = await getPlayerLive(decodedName, lastRating, lastDate);
        if (lResult.success && lResult.live) {
          setLiveData(lResult.live);
          playerRegion = lResult.live.region;
        }
      } catch (err) {
        console.error("Live fetch error:", err);
      } finally {
        setLoadingLive(false);
      }

      try {
        const hResult = await getPlayerHistory(decodedName, playerRegion);
        if (hResult.success && hResult.history) {
          const history = hResult.history;
          const formatted = history.map((h: { rating: number; created_at: string }) => ({
            mmr: h.rating,
            date: new Date(h.created_at).toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(h.created_at).getTime(),
            fullDate: h.created_at,
          }));
          setHistoryData(formatted);

          if (history.length > 0) {
            const last = history[history.length - 1];
            lastRating = last.rating;
            lastDate = last.created_at;
          }

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
  }, [decodedName, localeStr, t]);

  const isNewPeak = (liveData?.rating ?? 0) > stats.peak && stats.peak > 0;

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        zIndex: 100,
      }} />

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 20px 64px' }}>

        {/* Back link */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '10px 4px',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-muted)',
            marginBottom: 24,
            transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ChevronLeft size={16} />
          {t.backToLeaderboard}
        </Link>

        {error && (
          <div style={{
            marginBottom: 24,
            padding: '12px 16px',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.15)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--red)',
            fontSize: 13,
            fontWeight: 500,
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Twitch live banner */}
        {twitchData?.isLive && (
          <div style={{
            marginBottom: 24,
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'rgba(167,139,250,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Tv size={18} color="var(--purple)" />
                </div>
                <span style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'var(--red)',
                  border: '2px solid var(--bg-surface)',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t.liveTwitchNow}
                </div>
                {twitchData.title && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {twitchData.title}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t.viewers}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {twitchData.viewerCount?.toLocaleString() || '0'}
                </div>
              </div>
              <a
                href={`https://twitch.tv/${twitchData.username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: 'rgba(167,139,250,0.15)',
                  color: 'var(--purple)',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.15)')}
              >
                {t.watchStream}
              </a>
            </div>
          </div>
        )}

        {/* Player header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: 20,
          marginBottom: 28,
          paddingBottom: 28,
          borderBottom: '1px solid var(--border-dim)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <TrendingUp size={22} color="var(--accent)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{
                  fontSize: 'clamp(22px, 5vw, 36px)',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {decodedName}
                </h1>
                {liveData ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px',
                    borderRadius: 6,
                    background: 'rgba(52,211,153,0.1)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--green)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    flexShrink: 0,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                    Live
                  </span>
                ) : loadingLive && !loadingHistory ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px',
                    borderRadius: 6,
                    background: 'var(--accent-dim)',
                    border: '1px solid rgba(232,168,56,0.15)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    flexShrink: 0,
                  }}>
                    <Loader2 size={10} className="animate-spin" /> {t.liveSync}
                  </span>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {t.bgStats}
                </span>
                {liveData && (
                  <>
                    <span style={{ color: 'var(--border-dim)' }}>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                      <Globe size={11} /> {liveData.region} #{liveData.rank}
                    </span>
                  </>
                )}
                {twitchData?.username && (
                  <>
                    <span style={{ color: 'var(--border-dim)' }}>·</span>
                    <a
                      href={`https://twitch.tv/${twitchData.username}`}
                      target="_blank"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--purple)', fontWeight: 500 }}
                    >
                      <Tv size={11} /> {twitchData.username}
                    </a>
                  </>
                )}
                <span style={{ color: 'var(--border-dim)' }}>·</span>
                <SocialLinksForm playerName={decodedName} />
                <span style={{ color: 'var(--border-dim)' }}>·</span>
                <PlayerCompare currentName={decodedName} />
              </div>
            </div>
          </div>

          {/* Current MMR */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {isNewPeak && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginBottom: 4, fontSize: 10, fontWeight: 600, color: 'var(--accent)' }}>
                <Award size={10} /> {t.newPeak}
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {t.currentScore}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontSize: 'clamp(28px, 6vw, 40px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
                color: liveData ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'color 300ms',
              }}>
                {(liveData?.rating || stats.peak || 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>MMR</span>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 28 }}>
          {[
            { title: t.historicalPeak, value: stats.peak || (liveData ? liveData.rating : '-'), icon: <Trophy size={20} />, color: 'var(--accent)' },
            { title: t.trend7d, value: `${stats.gain7d > 0 ? '+' : ''}${stats.gain7d}`, icon: <Activity size={20} />, color: stats.gain7d >= 0 ? 'var(--green)' : 'var(--red)' },
            { title: t.matchesAnalyzed, value: stats.games, icon: <Swords size={20} />, color: 'var(--purple)' },
          ].map(item => (
            <div
              key={item.title}
              style={{
                padding: '14px 16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-dim)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${item.color}10`,
                border: `1px solid ${item.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.color,
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                  {item.title}
                </div>
                {loadingHistory ? (
                  <div style={{ width: 50, height: 16, borderRadius: 4, background: 'var(--bg-subtle)' }} />
                ) : (
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Achievement badges */}
        {!loadingHistory && stats.peak > 0 && (
          <AchievementBadges
            peakMmr={stats.peak}
            currentRank={liveData?.rank ?? 0}
            gamesPlayed={stats.games}
            gain7d={stats.gain7d}
          />
        )}

        {/* Chart */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          borderRadius: 10,
          padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              MMR History
            </span>
            <div style={{ display: 'flex', gap: 1, padding: 2, background: 'var(--bg-base)', borderRadius: 6 }}>
              {TIME_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeRange(key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    background: timeRange === key ? 'var(--accent)' : 'transparent',
                    color: timeRange === key ? 'var(--bg-base)' : 'var(--text-muted)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 'clamp(250px, 45vw, 400px)' }}>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    fontWeight={500}
                    ticks={xAxisTicks}
                    tickFormatter={(ts: number) => formatXAxisDate(ts, timeRange, localeStr)}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-8}
                    fontWeight={500}
                    tickFormatter={(val) => val.toLocaleString()}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-mid)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                    cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    itemStyle={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}
                    labelStyle={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                    formatter={(value: unknown) => [`${(value as number).toLocaleString()}`, t.rating]}
                    labelFormatter={(label: unknown) => formatTooltipDate(label as number, localeStr)}
                  />
                  <Area
                    type="monotoneX"
                    dataKey="mmr"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#mmrGradient)"
                    isAnimationActive={false}
                    activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                    dot={false}
                  />
                  <defs>
                    <linearGradient id="mmrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            ) : loadingHistory ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                <Loader2 size={24} color="var(--accent)" className="animate-spin" />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t.searchingHistory}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
                <Activity size={32} color="var(--text-muted)" opacity={0.4} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t.incompleteData}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280 }}>
                  {t.incompleteDataDesc}
                </span>
                {loadingLive && <Loader2 size={16} color="var(--accent)" className="animate-spin" />}
              </div>
            )}
          </div>
        </div>
      </div>

      <ScrollToTop />
    </main>
  );
}
