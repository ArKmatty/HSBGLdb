"use client";
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, TrendingUp, Trophy, Activity, Swords, Globe, AlertCircle, Loader2, Award } from 'lucide-react';
import Link from 'next/link';
import { getPlayerHistory, getPlayerLive } from '@/app/actions/player';
import { getTwitchStatusForPlayer } from '@/app/actions/twitch';
import { detectLocaleClient, translations } from '@/lib/i18n';
import { computeStats, bucketizeHistory } from '@/lib/stats';
import ScrollToTop from '@/components/ScrollToTop';
import { ChartSkeleton } from '@/components/Skeleton';

// Lazy-load heavy components to reduce initial bundle size
const MMRChart = dynamic(() => import('./MMRChart'), { 
  ssr: false, 
  loading: () => <ChartSkeleton /> 
});
const SocialLinksForm = dynamic(() => import('@/components/SocialLinksForm'));
const PlayerCompare = dynamic(() => import('@/components/PlayerCompare'));
const AchievementBadges = dynamic(() => import('@/components/AchievementBadges'));
const WatchlistButton = dynamic(() => import('@/components/WatchlistButton'));
const CopyButton = dynamic(() => import('@/components/CopyButton'));

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const decodedName = decodeURIComponent(name as string);
  const urlRegion = searchParams.get('region')?.toUpperCase();
  const [locale] = useState(() => detectLocaleClient());
  const t = translations[locale];
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [twitchData, setTwitchData] = useState<TwitchData | null>(null);
  const [stats, setStats] = useState({ peak: 0, games: 0, gain7d: 0 });
  const [latestSnapshotRating, setLatestSnapshotRating] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingLive, setLoadingLive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const chartData = useMemo(() => {
    const cutoff = timeRange === 'all' ? 0 : Date.now() - RANGE_MS[timeRange];
    const filtered = historyData.filter(h => h.timestamp >= cutoff);
    return bucketizeHistory(filtered, timeRange, liveData ?? undefined);
  }, [historyData, timeRange, liveData]);

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
      let playerRegion: string | undefined = urlRegion;

      // Step 1: Fetch live data first to determine the correct region
      // This prevents region collision when the same username exists in multiple regions (e.g., US + CN)
      // Pass urlRegion to prioritize the region from the URL
      const lResult = await getPlayerLive(decodedName, lastRating, lastDate, urlRegion).catch((err) => {
        console.error("Live fetch error:", err);
        return { success: false, live: null };
      });

      if (lResult.success && lResult.live) {
        setLiveData(lResult.live);
        // Use live data's region if URL region wasn't specified
        playerRegion = playerRegion || lResult.live.region;
      } else {
        console.log(`[PlayerPage] Live scan returned null for ${decodedName}, falling back to snapshot`);
      }
      setLoadingLive(false);

      // Step 2: Fetch history with the determined region and time range
      // This ensures we only get history for the correct region, avoiding cross-region data pollution
      // Pass timeRange to optimize the query limit
      const hResult = await getPlayerHistory(decodedName, playerRegion, 100, timeRange).catch((err) => {
        console.error("History fetch error:", err);
        return { success: false, history: [], error: 'Database error' };
      });

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
          setLatestSnapshotRating(last.rating);
        }

        const statsResult = computeStats(history);
        setStats({ peak: statsResult.peak, games: statsResult.games, gain7d: statsResult.gain7d });
      } else if (!hResult.success) {
        setError(hResult.error || t.databaseError);
      }
      setLoadingHistory(false);

      // Step 3: Fetch Twitch data (independent of region)
      const tData = await getTwitchStatusForPlayer(decodedName).catch((e) => {
        console.error("Twitch server fetch error:", e);
        return null;
      });

      if (tData) {
        setTwitchData(tData);
      }
    }

    fetchAll();
  }, [decodedName, localeStr, t, urlRegion]);

  const currentRating = liveData?.rating ?? latestSnapshotRating ?? 0;
  const isNewPeak = currentRating > stats.peak && stats.peak > 0;
  const displayPeak = Math.max(stats.peak, liveData?.rating ?? 0);

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>

      {/* Accent line below sticky navbar */}
      <div style={{
        position: 'fixed',
        top: 56, // Height of the sticky navbar
        left: 0,
        right: 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        zIndex: 49, // Below navbar (zIndex: 50)
      }} />

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 20px 64px' }}>

        {/* Back link */}
        <Link
          href={`/?region=${urlRegion || 'EU'}`}
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
            border: '1px solid rgba(145,70,255,0.2)',
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
                  background: 'rgba(145,70,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#9146FF">
                    <path d="M4.265 1 2 5.385v13.229h4.504V23l4.313-4.386h3.616L21.736 11.3V1H4.265zm2.382 2.308h12.698v7.269l-4.504 4.634h-4.313L7.27 19.304v-4.093H6.647V3.308zm3.656 3.23v4.053h2.156V6.538H10.303zm5.66 0v4.053h2.157V6.538h-2.157z"/>
                  </svg>
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
                <CopyButton text={decodedName} label="Name" />
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
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9146FF', fontWeight: 500 }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4.265 1 2 5.385v13.229h4.504V23l4.313-4.386h3.616L21.736 11.3V1H4.265zm2.382 2.308h12.698v7.269l-4.504 4.634h-4.313L7.27 19.304v-4.093H6.647V3.308zm3.656 3.23v4.053h2.156V6.538H10.303zm5.66 0v4.053h2.157V6.538h-2.157z"/>
                      </svg>
                      {twitchData.username}
                    </a>
                  </>
                )}
                <span style={{ color: 'var(--border-dim)' }}>·</span>
                <WatchlistButton playerName={decodedName} />
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
                {(liveData?.rating ?? latestSnapshotRating ?? stats.peak ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>MMR</span>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 28 }}>
          {[
            { title: t.historicalPeak, value: displayPeak || '-', icon: <Trophy size={20} />, color: 'var(--accent)' },
            { title: t.trend7d, value: `${stats.gain7d > 0 ? '+' : ''}${stats.gain7d}`, icon: <Activity size={20} />, color: stats.gain7d >= 0 ? 'var(--green)' : 'var(--red)' },
            { title: t.matchesAnalyzed, value: stats.games, icon: <Swords size={20} />, color: 'var(--purple)' },
          ].map(item => (
            <div
              key={item.title}
              style={{
                padding: '14px 16px',
                background: 'var(--gradient-card)',
                border: '1px solid var(--border-dim)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: 'var(--shadow-sm)',
                transition: 'box-shadow 150ms, transform 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.transform = 'translateY(0)';
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
            currentRank={liveData?.rank ?? 0}
            gamesPlayed={stats.games}
            gain7d={stats.gain7d}
          />
        )}

        {/* Chart */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-dim)',
            borderRadius: 10,
            padding: 16,
          }}
          role="region"
          aria-label="MMR history chart showing player rating changes over time"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              MMR History
            </span>
            <div style={{ display: 'flex', gap: 1, padding: 2, background: 'var(--bg-base)', borderRadius: 6 }}>
              {TIME_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeRange(key)}
                  aria-pressed={timeRange === key}
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

          <div style={{ height: 'clamp(250px, 45vw, 400px)' }} role="img" aria-label={`Line chart showing MMR progression`}>
            {chartData.length > 1 ? (
              <MMRChart 
                historyData={historyData}
                liveData={liveData}
                timeRange={timeRange}
                locale={localeStr}
                loadingHistory={loadingHistory}
              />
            ) : loadingHistory ? (
              <ChartSkeleton />
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

          {/* Hidden data table for screen readers */}
          <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
            <table aria-label="MMR history data table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">MMR Rating</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((point, i) => (
                  <tr key={i}>
                    <td>{point.isLive ? 'Live' : point.date}</td>
                    <td>{point.mmr.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ScrollToTop />
    </main>
  );
}
