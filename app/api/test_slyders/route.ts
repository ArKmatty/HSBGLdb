import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const secretParam = url.searchParams.get('secret');

  if (authHeader !== `Bearer ${CRON_SECRET}` && secretParam !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('leaderboard_history')
    .select('*')
    .eq('accountId', 'Slyders');
  
  return NextResponse.json({ count: data?.length, data, error });
}
