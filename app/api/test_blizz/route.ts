import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getLeaderboard } from '@/lib/blizzard';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const secretParam = url.searchParams.get('secret');

  if (authHeader !== `Bearer ${CRON_SECRET}` && secretParam !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const players = await getLeaderboard('EU', 1);
  const playerNames = players.map(p => p.accountid);
  const { data: lastSnapshots, error } = await supabase
    .from('leaderboard_history')
    .select('accountId, rating, created_at')
    .in('accountId', playerNames)
    .order('created_at', { ascending: false });

  const slydersSnapshots = lastSnapshots?.filter(s => s.accountId === 'Slyders');
  const slydersPlayer = players.find(p => p.accountid === 'Slyders');

  const previousRecord = slydersSnapshots?.find(s => s.rating !== slydersPlayer?.rating);

  return NextResponse.json({
    slyders_player_rating: slydersPlayer?.rating,
    slyders_snapshots: slydersSnapshots,
    previous_found: previousRecord
  });
}
