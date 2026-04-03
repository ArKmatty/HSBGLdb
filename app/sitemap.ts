import { supabaseAdmin } from '@/lib/supabase';

export default async function sitemap() {
  // Use explicit production URL — update this to your actual domain
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hsbg-leaderboard.vercel.app';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  const regions = ['EU', 'US', 'AP', 'CN'];

  const regionUrls = regions.map(region => ({
    url: `${cleanBaseUrl}/?region=${region}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  }));

  // Static pages that always exist
  const staticPages = [
    {
      url: cleanBaseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 1,
    },
    {
      url: `${cleanBaseUrl}/patch-notes`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
  ];

  // Limit player URLs to top 100 to prevent timeout
  let playerUrls: Array<{ url: string; lastModified: Date; changeFrequency: string; priority: number }> = [];
  try {
    const { data: topPlayers } = await supabaseAdmin
      .from('leaderboard_history')
      .select('accountId, region, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

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
  } catch (error) {
    console.error('[Sitemap] Error fetching players:', error);
    // Graceful degradation — sitemap still works without player URLs
  }

  return [
    ...staticPages,
    ...regionUrls,
    ...playerUrls,
  ];
}
