import Link from 'next/link';
import { headers } from 'next/headers';
import { getLeaderboard } from '../lib/blizzard';
import { getTopMovers } from '../lib/stats';
import LeaderboardTable from '../components/LeaderboardTable';
import TopMoversWidget from '../components/TopMoversWidget';
import RecentSearches from '../components/RecentSearches';
import ScrollToTop from '../components/ScrollToTop';
import { getTwitchStatusesForLeaderboard } from './actions/twitch';
import { detectLocale, translations, type Locale } from '@/lib/i18n';

export default async function Home({ searchParams }: { searchParams: Promise<{ region?: string, page?: string }> }) {
  const params = await searchParams;
  const region = (params.region || 'EU').toUpperCase();
  const currentPage = parseInt(params.page || '1');
  const locale = detectLocale(await headers());
  const t = translations[locale];

  const [players, topMovers] = await Promise.all([
    getLeaderboard(region, currentPage),
    getTopMovers(region)
  ]);

  const playerIds = players.map(p => p.accountid);
  const twitchStatuses = await getTwitchStatusesForLeaderboard(playerIds);

  const regions = ['EU', 'US', 'AP'];

  return (
    <main style={{ minHeight: '100dvh' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'relative',
        borderBottom: '1px solid var(--border-dim)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        }} />

        <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px 0' }}>
          {/* Top bar: brand + region selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--accent)',
                letterSpacing: '-0.02em',
              }}>
                BG
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Leaderboard
              </span>
            </div>

            {/* Region selector */}
            <div style={{ display: 'flex', background: 'var(--bg-base)', borderRadius: 8, padding: 2 }}>
              {regions.map(r => (
                <Link
                  key={r}
                  href={`/?region=${r}&page=1`}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 150ms',
                    background: region === r ? 'var(--bg-elevated)' : 'transparent',
                    color: region === r ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {r}
                </Link>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{
              fontSize: 'clamp(22px, 4vw, 32px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: '0 0 4px',
              lineHeight: 1.2,
            }}>
              {region} Battlegrounds
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 400 }}>
              {t.subtitle}
            </p>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px 64px' }}>
        <RecentSearches locale={locale} />
        <TopMoversWidget players={topMovers} locale={locale} />
        <LeaderboardTable players={players} twitchStatuses={twitchStatuses} locale={locale} />

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 28 }}>
          {currentPage > 1 && (
            <Link
              href={`/?region=${region}&page=${currentPage - 1}`}
              style={{
                padding: '12px 20px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-dim)',
                color: 'var(--text-secondary)',
                transition: 'border-color 150ms, color 150ms',
              }}
            >
              {t.previous}
            </Link>
          )}
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
            {t.page} {currentPage}
          </span>
          {players.length >= 10 && (
            <Link
              href={`/?region=${region}&page=${currentPage + 1}`}
              style={{
                padding: '12px 20px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-dim)',
                color: 'var(--text-secondary)',
                transition: 'border-color 150ms, color 150ms',
              }}
            >
              {t.next}
            </Link>
          )}
        </div>
      </div>
      <ScrollToTop />
    </main>
  );
}
