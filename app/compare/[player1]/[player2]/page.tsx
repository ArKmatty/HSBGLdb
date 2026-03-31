"use client";
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { ChevronLeft, Trophy, Activity, Swords, AlertCircle, Loader2, GitCompare } from 'lucide-react';
import Link from 'next/link';
import { getPlayerHistory, getPlayerLive } from '@/app/actions/player';
import { detectLocaleClient, translations } from '@/lib/i18n';
import ScrollToTop from '@/components/ScrollToTop';
import { ChartSkeleton } from '@/components/Skeleton';

type TimeRange = '24h' | '7d' | '30d' | 'all';

interface HistoryPoint {
  mmr: number;
  date: string;
  timestamp: number;
  fullDate?: string;
}

interface PlayerData {
  name: string;
  history: HistoryPoint[];
  stats: { peak: number; games: number; gain7d: number };
  loading: boolean;
  error: string | null;
}

const COLORS = ['#e8a838', '#a78bfa'];

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

function computeStats(history: HistoryPoint[]) {
  let peak = 0;
  let gamesCount = 0;
  for (let i = 0; i < history.length; i++) {
    if (history[i].mmr > peak) peak = history[i].mmr;
    if (i > 0 && history[i].mmr !== history[i - 1].mmr) gamesCount++;
  }
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const records7d = history.filter(h => new Date(h.fullDate || h.timestamp) >= sevenDaysAgo);
  const gain7d = records7d.length > 0
    ? history[history.length - 1].mmr - records7d[0].mmr
    : 0;
  return { peak, games: gamesCount, gain7d };
}

export default function ComparePage() {
  const { player1, player2 } = useParams();
  const router = useRouter();
  const [locale] = useState(() => detectLocaleClient());
  const t = translations[locale];
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [now] = useState(() => Date.now());
  const [players, setPlayers] = useState<[PlayerData, PlayerData]>([
    { name: decodeURIComponent(player1 as string), history: [], stats: { peak: 0, games: 0, gain7d: 0 }, loading: true, error: null },
    { name: decodeURIComponent(player2 as string), history: [], stats: { peak: 0, games: 0, gain7d: 0 }, loading: true, error: null },
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const fetchPlayer = useCallback(async (index: 0 | 1) => {
    const name = index === 0 ? decodeURIComponent(player1 as string) : decodeURIComponent(player2 as string);
    setPlayers(prev => prev.map((p, i) => i === index ? { ...p, loading: true, error: null } : p) as [PlayerData, PlayerData]);
    try {
      let region: string | undefined;
      try {
        const liveResult = await getPlayerLive(name);
        if (liveResult.success && liveResult.live) {
          region = liveResult.live.region;
        }
      } catch {
        // Fall back to unfiltered history
      }

      const result = await getPlayerHistory(name, region);
      if (result.success && result.history) {
        const formatted = result.history.map((h: { rating: number; created_at: string }) => ({
          mmr: h.rating,
          date: new Date(h.created_at).toLocaleTimeString(locale === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(h.created_at).getTime(),
          fullDate: h.created_at,
        }));
        const stats = computeStats(formatted);
        setPlayers(prev => prev.map((p, i) => i === index ? { ...p, history: formatted, stats, loading: false } : p) as [PlayerData, PlayerData]);
      } else {
        setPlayers(prev => prev.map((p, i) => i === index ? { ...p, loading: false, error: result.error || 'Failed to load' } : p) as [PlayerData, PlayerData]);
      }
    } catch {
      setPlayers(prev => prev.map((p, i) => i === index ? { ...p, loading: false, error: 'Network error' } : p) as [PlayerData, PlayerData]);
    }
  }, [player1, player2, locale]);

  useEffect(() => {
    void (async () => {
      await Promise.all([fetchPlayer(0), fetchPlayer(1)]);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const chartData = useMemo(() => {
    const cutoff = timeRange === 'all' ? 0 : now - RANGE_MS[timeRange];
    const p1Raw = players[0].history.filter(h => h.timestamp >= cutoff);
    const p2Raw = players[1].history.filter(h => h.timestamp >= cutoff);

    // Aggregate each player into time buckets to reduce noise
    const BUCKET_MS: Record<TimeRange, number> = {
      '24h': 2 * 60 * 60 * 1000,
      '7d': 6 * 60 * 60 * 1000,
      '30d': 24 * 60 * 60 * 1000,
      'all': 72 * 60 * 60 * 1000,
    };
    const bucketSize = BUCKET_MS[timeRange];

    function bucketize(data: HistoryPoint[]): HistoryPoint[] {
      const result: HistoryPoint[] = [];
      let bucketStart: number | null = null;
      let bucketPoints: HistoryPoint[] = [];
      for (const point of data) {
        if (bucketStart === null) {
          bucketStart = point.timestamp;
          bucketPoints = [point];
        } else if (point.timestamp - bucketStart < bucketSize) {
          bucketPoints.push(point);
        } else {
          result.push(bucketPoints[bucketPoints.length - 1]);
          bucketStart = point.timestamp;
          bucketPoints = [point];
        }
      }
      if (bucketPoints.length > 0) {
        result.push(bucketPoints[bucketPoints.length - 1]);
      }
      return result;
    }

    const p1 = bucketize(p1Raw);
    const p2 = bucketize(p2Raw);

    // Merge all unique timestamps from both bucketed players
    const allTimestamps = new Set([...p1.map(h => h.timestamp), ...p2.map(h => h.timestamp)]);
    const sorted = Array.from(allTimestamps).sort((a, b) => a - b);

    return sorted.map(ts => {
      const p1Point = p1.find(h => h.timestamp === ts);
      const p2Point = p2.find(h => h.timestamp === ts);
      return {
        timestamp: ts,
        [players[0].name]: p1Point?.mmr ?? null,
        [players[1].name]: p2Point?.mmr ?? null,
      };
    }).filter((point, i, arr) => {
      if (i === 0) return true;
      if (arr.length - i === 1) return true; // Keep last point
      const prev = arr[i - 1];
      return point[players[0].name] !== prev[players[0].name] || point[players[1].name] !== prev[players[1].name];
    });
  }, [players, timeRange, now]);

  const isLoading = players[0].loading || players[1].loading;
  const hasError = players[0].error || players[1].error;

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', zIndex: 100,
      }} />

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 20px 64px' }}>
        <Link
          href={`/player/${encodeURIComponent(players[0].name)}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '10px 4px', fontSize: 13, fontWeight: 500,
            color: 'var(--text-muted)', marginBottom: 24, transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ChevronLeft size={16} />
          {t.backToLeaderboard}
        </Link>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28,
          paddingBottom: 28, borderBottom: '1px solid var(--border-dim)', flexWrap: 'wrap',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <GitCompare size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
              {players[0].name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {players[1].name}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>MMR History Comparison</p>
          </div>
        </div>

        {hasError && (
          <div style={{
            marginBottom: 24, padding: '12px 16px', background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.15)', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: 13, fontWeight: 500,
          }}>
            <AlertCircle size={16} />
            {hasError}
          </div>
        )}

        {/* Stats comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {players.map((p, idx) => (
            <div key={p.name} style={{
              padding: 16, background: 'var(--bg-surface)', border: `1px solid ${COLORS[idx]}30`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx] }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
              </div>
              {p.loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Peak', value: p.stats.peak, icon: <Trophy size={14} /> },
                    { label: '7d Trend', value: `${p.stats.gain7d > 0 ? '+' : ''}${p.stats.gain7d}`, icon: <Activity size={14} /> },
                    { label: 'Games', value: p.stats.games, icon: <Swords size={14} /> },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {players.map((p, idx) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: COLORS[idx] }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx] }} />
                  {p.name}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 1, padding: 2, background: 'var(--bg-base)', borderRadius: 6 }}>
              {TIME_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeRange(key)}
                  style={{
                    padding: '8px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all 150ms',
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
            {isLoading ? (
              <ChartSkeleton />
            ) : chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" />
                  <XAxis
                    dataKey="timestamp" type="number" scale="time"
                    domain={['dataMin', 'dataMax']} stroke="var(--text-muted)"
                    fontSize={10} tickLine={false} axisLine={false} dy={10} fontWeight={500}
                    tickFormatter={(ts: number) => new Date(ts).toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    domain={['dataMin - 150', 'dataMax + 150']}
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-8}
                    fontWeight={500}
                    tickFormatter={(val: number) => val.toLocaleString()}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-mid)',
                      borderRadius: 8, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                    cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    labelFormatter={(label: unknown) => new Date(label as number).toLocaleString(locale === 'it' ? 'it-IT' : 'en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  />
                  {players.map((p, idx) => (
                    <Area
                      key={p.name}
                      type="linear"
                      dataKey={p.name}
                      stroke={COLORS[idx]}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`${COLORS[idx]}15`}
                      isAnimationActive={false}
                      connectNulls={false}
                      dot={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
                <Activity size={32} color="var(--text-muted)" opacity={0.4} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Not enough data to compare</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <ScrollToTop />
    </main>
  );
}
