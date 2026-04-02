import type { Metadata, ResolvingMetadata } from 'next';
import { getPlayerLiveStats } from '@/lib/blizzard';

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const name = decodeURIComponent((await params).name);

  // Fetch player data for dynamic OG image
  let rating = 0;
  let rank = '-';
  let region = 'EU';
  let peak = 0;

  try {
    const live = await getPlayerLiveStats(name);
    if (live) {
      rating = live.rating;
      rank = String(live.rank);
      region = live.region;
    }
  } catch {
    // Use defaults if fetch fails
  }

  const previous = await parent;
  const title = `${name} — Hearthstone Battlegrounds Stats`;
  const description = `View MMR history, live ranking, and Twitch status for Hearthstone Battlegrounds player ${name}.`;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-domain.com');
  const url = `${baseUrl}/player/${encodeURIComponent(name)}`;
  const ogImage = `${baseUrl}/api/og/player/${encodeURIComponent(name)}?rating=${rating}&rank=${rank}&region=${region}&peak=${peak || rating}`;

  return {
    title,
    description,
    openGraph: {
      ...previous.openGraph,
      title,
      description,
      url,
      type: 'profile',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${name} MMR Stats` }],
    },
    twitter: {
      ...previous.twitter,
      title,
      description,
      card: 'summary_large_image',
      images: [ogImage],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
