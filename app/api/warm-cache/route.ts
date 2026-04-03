import { NextResponse } from 'next/server';
import { getLeaderboard, getMultiRegionLeaderboard } from '@/lib/blizzard';
import { getMoversAndFallers } from '@/lib/stats';

/**
 * Pre-warms the cache for common leaderboard queries
 * Call this after cron sync to ensure fast TTFB for users
 * 
 * Usage: POST /api/warm-cache with Bearer CRON_SECRET
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const start = Date.now();
  const results: string[] = [];

  try {
    // Warm cache for each region's first page
    for (const region of ['EU', 'US', 'AP', 'CN']) {
      await getLeaderboard(region, 1);
      results.push(`Warmed ${region} page 1`);
    }

    // Warm cache for multi-region (ALL)
    await getMultiRegionLeaderboard(['EU', 'US', 'AP', 'CN'], 1);
    results.push('Warmed ALL regions page 1');

    // Warm cache for top movers/fallers
    for (const region of ['EU', 'US', 'AP', 'CN']) {
      await getMoversAndFallers(region);
      results.push(`Warmed movers/fallers for ${region}`);
    }

    const duration = Date.now() - start;
    console.log(`[Cache Warm] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    console.error('[Cache Warm] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      partialResults: results,
    }, { status: 500 });
  }
}
