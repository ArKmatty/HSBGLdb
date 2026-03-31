import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface PatchNote {
  id: string;
  title: string;
  date: string;
  url: string;
  image_url?: string;
  summary: string;
  battlegrounds_changes: string;
  created_at: string;
}

const PATCH_NOTES_URLS = [
  'https://hearthstone.blizzard.com/en-us/news/24267727/35-0-patch-notes',
  'https://hearthstone.blizzard.com/en-us/blog/24242744/',
  'https://hearthstone.blizzard.com/en-us/blog/24250382/',
  'https://hearthstone.blizzard.com/en-us/blog/24179332/31-6-patch-notes',
];

function extractBattlegroundsSection(html: string): string {
  const bgSectionMatch = html.match(/##\s*Battlegrounds\s*([\s\S]*?)(?=##\s*Bug Fixes|$)/i);
  if (bgSectionMatch) {
    return bgSectionMatch[1].trim();
  }
  return '';
}

function cleanHtml(html: string): string {
  return html
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function fetchPatchNotes(limit = 10): Promise<PatchNote[]> {
  if (!supabase) {
    console.warn('[PatchNotes] Supabase not configured');
    return [];
  }

  try {
    const { data: existing, error } = await supabase
      .from('patch_notes')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (existing && existing.length > 0) {
      return existing;
    }

    return [];
  } catch (err) {
    console.error('[PatchNotes] Error fetching from Supabase:', err);
    return [];
  }
}

export async function refreshPatchNotes(): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  let newCount = 0;

  for (const url of PATCH_NOTES_URLS) {
    try {
      console.log('[PatchNotes] Fetching:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.log('[PatchNotes] Fetch failed with status:', res.status);
        continue;
      }

      const html = await res.text();
      console.log('[PatchNotes] Got HTML, length:', html.length);

      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const dateMatch = html.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      const imageMatch = html.match(/<img[^>]+src="([^"]+patch[^"]+)"/i);
      const summaryMatch = html.match(/<p[^>]*>([^<]{50,200})<\/p>/i);

      const title = titleMatch?.[1]?.trim() || 'Patch Notes';
      const date = dateMatch?.[1] || new Date().toLocaleDateString('en-US');
      const imageUrl = imageMatch?.[1];
      const summary = summaryMatch?.[1]?.trim() || '';

      const bgChanges = extractBattlegroundsSection(html);
      const cleanBgChanges = cleanHtml(bgChanges);

      if (!cleanBgChanges) continue;

      const id = url.split('/').pop() || title.toLowerCase().replace(/\s+/g, '-');

      const { error: upsertError } = await supabase
        .from('patch_notes')
        .upsert({
          id,
          title,
          date,
          url,
          image_url: imageUrl || null,
          summary,
          battlegrounds_changes: cleanBgChanges,
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (upsertError) {
        console.error('[PatchNotes] Upsert error:', upsertError);
      } else {
        console.log('[PatchNotes] Saved patch:', title);
        newCount++;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[PatchNotes] Error fetching:', url, errorMessage);
    }
  }

  console.log('[PatchNotes] Total saved:', newCount);
  return { success: true, count: newCount };
}

export async function getPatchNotes(limit = 10): Promise<PatchNote[]> {
  const cached = await fetchPatchNotes(limit);
  
  if (cached.length === 0) {
    await refreshPatchNotes();
    return fetchPatchNotes(limit);
  }

  return cached;
}
