import type { Metadata, ResolvingMetadata } from 'next';

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const name = decodeURIComponent((await params).name);

  const previous = await parent;
  const title = `${name} — Hearthstone Battlegrounds Stats`;
  const description = `View MMR history, live ranking, and Twitch status for Hearthstone Battlegrounds player ${name}.`;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';
  const url = `${baseUrl}/player/${encodeURIComponent(name)}`;

  return {
    title,
    description,
    openGraph: {
      ...previous.openGraph,
      title,
      description,
      url,
      type: 'profile',
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

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
