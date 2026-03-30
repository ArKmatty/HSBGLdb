import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('leaderboard_history')
    .select('*')
    .eq('accountId', 'Slyders');
  
  return NextResponse.json({ count: data?.length, data, error });
}
