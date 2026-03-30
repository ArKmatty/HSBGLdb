import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { getLeaderboard } from '../../../lib/blizzard';

export async function GET() {
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
