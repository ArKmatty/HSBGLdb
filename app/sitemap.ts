import { supabase } from '@/lib/supabase';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-domain.com');
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const regions = ['EU', 'US', 'AP', 'CN'];

  const regionUrls = regions.map(region => ({
    url: `${cleanBaseUrl}/?region=${region}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  }));

  let playerUrls: Array<{ url: string; lastModified: Date; changeFrequency: string; priority: number }> = [];
  try {
    const { data: topPlayers } = await supabase
      .from('leaderboard_history')
      .select('accountId, region, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (topPlayers?.length) {
      const seen = new Set<string>();
      playerUrls = topPlayers
        .filter(p => {
          const key = p.accountId.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(p => ({
          url: `${cleanBaseUrl}/player/${encodeURIComponent(p.accountId)}`,
          lastModified: new Date(p.created_at),
          changeFrequency: 'daily' as const,
          priority: 0.7,
        }));
    }
  } catch {
    // Graceful degradation — sitemap still works without player URLs
  }

  return [
    {
      url: cleanBaseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 1,
    },
    ...regionUrls,
    ...playerUrls,
  ];
}
