import Link from 'next/link';
import { headers } from 'next/headers';
import { getLeaderboard } from '../lib/blizzard';
import { getTopMovers } from '../lib/stats';
import LeaderboardTable from '../components/LeaderboardTable';
import TopMoversWidget from '../components/TopMoversWidget';
import RecentSearches from '../components/RecentSearches';
import { getTwitchStatusesForLeaderboard } from './actions/twitch';
import { Sword } from 'lucide-react';
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
    <main style={{ minHeight: '100dvh', padding: '0 0 64px' }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--border-dim)',
        background: 'linear-gradient(180deg, rgba(59,130,246,0.04) 0%, transparent 100%)',
        padding: '40px 32px 32px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            }}>
              <Sword size={18} color="white" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Hearthstone Battlegrounds
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            margin: '0 0 8px',
            lineHeight: 1.1,
          }}>
            Global Leaderboard
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px', fontWeight: 500 }}>
            {t.subtitle}
          </p>

          {/* Region tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
            {regions.map(r => (
              <Link
                key={r}
                href={`/?region=${r}&page=1`}
                style={{
                  padding: '8px 22px',
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  transition: 'background 150ms, color 150ms, border-color 150ms',
                  border: region === r ? '1px solid var(--accent)' : '1px solid var(--border-mid)',
                  background: region === r ? 'var(--accent-dim)' : 'transparent',
                  color: region === r ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {r}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 24px 0' }}>
        <RecentSearches locale={locale} />
        <TopMoversWidget players={topMovers} locale={locale} />
        <LeaderboardTable players={players} twitchStatuses={twitchStatuses} locale={locale} />

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 36 }}>
          {currentPage > 1 && (
            <Link
              href={`/?region=${region}&page=${currentPage - 1}`}
              style={{
                padding: '9px 20px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-mid)',
                color: 'var(--text-secondary)',
                transition: 'border-color 150ms, color 150ms',
              }}
            >
              {t.previous}
            </Link>
          )}
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t.page} {currentPage}
          </span>
          <Link
            href={`/?region=${region}&page=${currentPage + 1}`}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-mid)',
              color: 'var(--text-secondary)',
              transition: 'border-color 150ms, color 150ms',
            }}
          >
            {t.next}
          </Link>
        </div>
      </div>
    </main>
  );
}