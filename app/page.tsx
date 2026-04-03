import type { Metadata, ResolvingMetadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getLeaderboard, getMultiRegionLeaderboard } from '../lib/blizzard';
import { getMoversAndFallers } from '../lib/stats';
import LeaderboardTable from '../components/LeaderboardTable';
import TopMoversWidget from '../components/TopMoversWidget';
import RecentSearches from '../components/RecentSearches';
import ScrollToTop from '../components/ScrollToTop';
import DataFreshness from '../components/DataFreshness';
import WatchlistWidget from '../components/WatchlistWidget';
import { getTwitchStatusesForLeaderboard } from './actions/twitch';
import { detectLocale, translations } from '@/lib/i18n';

type Props = {
  searchParams: Promise<{ region?: string | string[]; page?: string }>;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
}

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await searchParams;
  let regionParam = params.region || 'EU';
  
  const regions: string[] = Array.isArray(regionParam) 
    ? regionParam.map(r => r.toUpperCase())
    : [regionParam.toUpperCase()];
  
  const isMultiRegion = regions.length > 1 || (regions.length === 1 && regions[0] === 'ALL');
  const displayRegion = isMultiRegion ? 'All Regions' : regions[0];
  
  const page = parseInt(params.page || '1');
  const pageLabel = page > 1 ? ` — Page ${page}` : '';

  const regionNames: Record<string, string> = {
    EU: 'Europe',
    US: 'Americas',
    AP: 'Asia-Pacific',
    CN: 'China',
    ALL: 'All Regions',
  };
  
  const regionLabel = isMultiRegion 
    ? 'All Regions' 
    : regions.map(r => regionNames[r] || r).join(' + ');

  const title = `Hearthstone Battlegrounds Leaderboard${isMultiRegion ? '' : ` — ${regionLabel}`}${pageLabel}`;
  const description = isMultiRegion
    ? `Live MMR rankings for top Hearthstone Battlegrounds players across all regions. Track ratings, trends, and Twitch streams for EU, US, AP, and CN players.`
    : `Live MMR rankings for top Hearthstone Battlegrounds players in ${regionLabel}. Track ratings, trends, and Twitch streams for the best BG players.`;

  const baseUrl = getBaseUrl();
  const regionQuery = Array.isArray(params.region)
    ? params.region.join(',')
    : params.region || 'EU';

  const url = `${baseUrl}/?region=${regionQuery}${page > 1 ? `&page=${page}` : ''}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'HSBGLdb',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
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
  let regionParam = params.region || 'EU';
  
  // Handle both single region (string) and multiple regions (array)
  const regions: string[] = Array.isArray(regionParam) 
    ? regionParam.map(r => r.toUpperCase())
    : [regionParam.toUpperCase()];
  
  const isMultiRegion = regions.length > 1 || (regions.length === 1 && regions[0] === 'ALL');
  const displayRegion = isMultiRegion ? 'All Regions' : regions[0];
  const currentPage = parseInt(params.page || '1');
  const locale = detectLocale(await headers());
  const t = translations[locale];

  const region = regions[0] === 'ALL' ? 'EU' : regions[0];
  
  const [players, moversAndFallers] = await Promise.all([
    isMultiRegion
      ? getMultiRegionLeaderboard(regions.filter(r => r !== 'ALL'), currentPage)
      : getLeaderboard(regions[0], currentPage),
    getMoversAndFallers(region),
  ]);

  const { movers: topMovers, fallers: topFallers } = moversAndFallers;

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
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 20px 64px' }}>
        {/* Page title */}
        <div style={{ marginBottom: 24 }} className="animate-fade-in">
          <h1 style={{
            fontSize: 'clamp(22px, 4vw, 32px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            margin: '0 0 4px',
            lineHeight: 1.2,
          }}>
            Hearthstone Battlegrounds{isMultiRegion ? '' : ` — ${displayRegion}`}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 400 }}>
            {isMultiRegion ? 'Combined rankings across all regions' : t.subtitle}
          </p>
        </div>

        <RecentSearches locale={locale} />
        <WatchlistWidget locale={locale} region={regions[0]} />
        <TopMoversWidget players={topMovers} fallers={topFallers} locale={locale} region={displayRegion} />
        <LeaderboardTable players={players} twitchStatuses={twitchStatuses} locale={locale} region={displayRegion} />

        {/* Pagination */}
        <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 28 }} className="animate-fade-in">
          {currentPage > 1 && (
            <Link
              href={`/?region=${regions.join(',')}&page=${currentPage - 1}`}
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
              href={`/?region=${regions.join(',')}&page=${currentPage + 1}`}
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

        {/* SEO description section */}
        <section style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border-dim)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            About Hearthstone Battlegrounds Leaderboard
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <p style={{ marginBottom: 12 }}>
              HSBGLdb provides live <strong style={{ color: 'var(--text-primary)' }}>Hearthstone Battlegrounds MMR rankings</strong> for top players across all competitive regions: <strong style={{ color: 'var(--text-primary)' }}>Europe (EU)</strong>, <strong style={{ color: 'var(--text-primary)' }}>Americas (US)</strong>, <strong style={{ color: 'var(--text-primary)' }}>Asia-Pacific (AP)</strong>, and <strong style={{ color: 'var(--text-primary)' }}>China (CN)</strong>. Track real-time rating changes, historical trends, and player performance over the last 24 hours, 7 days, and 30 days.
            </p>
            <p style={{ marginBottom: 12 }}>
              Monitor <strong style={{ color: 'var(--text-primary)' }}>MMR trends</strong>, discover top movers and biggest fallers in the Battlegrounds ladder, and watch live Twitch streams from ranked players. Search any player by name to view their detailed rating history, peak MMR, and match statistics.
            </p>
            <p style={{ marginBottom: 0 }}>
              Data updates automatically every few minutes from the official Blizzard API. Whether you're tracking your climb to Legend or watching the top 100 race for rank #1, HSBGLdb gives you the competitive edge in Hearthstone Battlegrounds.
            </p>
          </div>
        </section>
      </div>
      <ScrollToTop />
    </main>
  );
}
