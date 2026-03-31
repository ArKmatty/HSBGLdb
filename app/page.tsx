import type { Metadata, ResolvingMetadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getLeaderboard } from '../lib/blizzard';
import { getTopMovers, getTopFallers } from '../lib/stats';
import LeaderboardTable from '../components/LeaderboardTable';
import TopMoversWidget from '../components/TopMoversWidget';
import RecentSearches from '../components/RecentSearches';
import ScrollToTop from '../components/ScrollToTop';
import DataFreshness from '../components/DataFreshness';
import { getTwitchStatusesForLeaderboard } from './actions/twitch';
import { detectLocale, translations } from '@/lib/i18n';

type Props = {
  searchParams: Promise<{ region?: string; page?: string }>;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
}

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await searchParams;
  const region = (params.region || 'EU').toUpperCase();
  const page = parseInt(params.page || '1');
  const pageLabel = page > 1 ? ` — Page ${page}` : '';

  const regionNames: Record<string, string> = {
    EU: 'Europe',
    US: 'Americas',
    AP: 'Asia-Pacific',
    CN: 'China',
  };
  const regionLabel = regionNames[region] || region;

  const title = `${regionLabel} Hearthstone Battlegrounds Leaderboard${pageLabel}`;
  const description = `Live MMR rankings for top Hearthstone Battlegrounds players in ${regionLabel}. Track ratings, trends, and Twitch streams for the best BG players.`;

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/?region=${region}${page > 1 ? `&page=${page}` : ''}`;

  const previous = await parent;

  return {
    title,
    description,
    openGraph: {
      ...previous.openGraph,
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      ...previous.twitter,
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const region = (params.region || 'EU').toUpperCase();
  const currentPage = parseInt(params.page || '1');
  const locale = detectLocale(await headers());
  const t = translations[locale];

  const [players, topMovers, topFallers] = await Promise.all([
    getLeaderboard(region, currentPage),
    getTopMovers(region),
    getTopFallers(region),
  ]);

  const playerIds = players.map(p => p.accountid);
  const twitchStatuses = await getTwitchStatusesForLeaderboard(playerIds);
  const now = new Date().getTime();

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>

      {/* ── Freshness indicator ── */}
      <div style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-dim)',
      }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '8px 20px' }}>
          <DataFreshness lastUpdated={now} />
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px 64px' }}>
        {/* Page title */}
        <div style={{ marginBottom: 20 }} className="animate-fade-in">
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

        <RecentSearches locale={locale} />
        <TopMoversWidget players={topMovers} fallers={topFallers} locale={locale} />
        <LeaderboardTable players={players} twitchStatuses={twitchStatuses} locale={locale} />

        {/* Pagination */}
        <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 28 }} className="animate-fade-in">
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
                transition: 'border-color 150ms, color 150ms, transform 150ms, box-shadow 150ms',
              }}
              className="pagination-btn"
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
                transition: 'border-color 150ms, color 150ms, transform 150ms, box-shadow 150ms',
              }}
              className="pagination-btn"
            >
              {t.next}
            </Link>
          )}
        </nav>
      </div>
      <ScrollToTop />
    </main>
  );
}
