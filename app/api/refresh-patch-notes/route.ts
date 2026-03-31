import { NextRequest, NextResponse } from 'next/server';
import { refreshPatchNotes } from '@/lib/patchNotes';

const AUTH_TOKEN = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  if (!AUTH_TOKEN) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token !== AUTH_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await refreshPatchNotes();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] Refresh patch notes error:', err);
    return NextResponse.json({ error: 'Failed to refresh' }, { status: 500 });
  }
}
