import { supabaseAdmin } from './supabase';

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

async function discoverPatchNoteUrls(): Promise<string[]> {
  const urls: string[] = [];
  
  const fallbackUrls = [
    'https://hearthstone.blizzard.com/en-us/news/24267727/35-0-patch-notes',
    'https://hearthstone.blizzard.com/en-us/news/24242744/34-6-2-patch-notes',
    'https://hearthstone.blizzard.com/en-us/news/24242740/34-6-patch-notes',
    'https://hearthstone.blizzard.com/en-us/news/24244400/34-4-2-patch-notes',
    'https://hearthstone.blizzard.com/en-us/news/24245106/34-4-patch-notes',
    'https://hearthstone.blizzard.com/en-us/news/24250382/34-2-2-patch-notes',
    'https://hearthstone.blizzard.com/en-us/news/24244423/34-2-patch-notes-battlegrounds-arena-and-gameplay-updates',
  ];
  
  for (const url of fallbackUrls) {
    urls.push(url);
  }
  
  try {
    const res = await fetch('https://hearthstone.blizzard.com/en-us/news/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });
    if (res.ok) {
      const html = await res.text();
      const linkMatches = html.match(/https:\/\/hearthstone\.blizzard\.com\/en-us\/news\/\d+\/[a-z0-9-]+-patch-notes/g) || [];
      for (const u of linkMatches) {
        if (!urls.includes(u)) urls.push(u);
      }
    }
  } catch (err) {
    console.error('[PatchNotes] Failed to discover URLs:', err);
  }
  
  return [...new Set(urls)];
}

function extractBattlegroundsSection(html: string): string {
  const bgMatch = html.match(/Battlegrounds\s*(?:Updates?|Updates for)\s*Dev Comment:?([\s\S]*?)(?=(?:Arena\s*Update|Bug\s*Fixes|Hearthstone Updates|$))/i);
  if (bgMatch) {
    return bgMatch[1].trim();
  }
  const fallbackMatch = html.match(/Battlegrounds\s*Updates?([\s\S]*?)(?=(?:Arena\s*Update|Bug\s*Fixes|$))/i);
  if (fallbackMatch) {
    return fallbackMatch[1].trim();
  }
  const bugFixMatch = html.match(/\[Battlegrounds\]([\s\S]*?)(?:\[|$)/i);
  if (bugFixMatch) {
    return bugFixMatch[1].trim();
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
  if (!supabaseAdmin) {
    console.warn('[PatchNotes] Supabase not configured');
    return [];
  }

  try {
    const { data: existing, error } = await supabaseAdmin
      .from('patch_notes')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (existing && existing.length > 0) {
      const sorted = [...existing].sort((a, b) => {
        const parseDate = (d: string) => {
          const match = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (match) {
            return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2])).getTime();
          }
          return new Date(d).getTime();
        };
        return parseDate(b.date) - parseDate(a.date);
      });
      return sorted;
    }

    return [];
  } catch (err) {
    console.error('[PatchNotes] Error fetching from Supabase:', err);
    return [];
  }
}

export async function refreshPatchNotes(): Promise<{ success: boolean; count?: number; error?: string }> {
  console.log('[PatchNotes] Starting refresh...');
  
  if (!supabaseAdmin) {
    console.log('[PatchNotes] Supabase client not initialized');
    return { success: false, error: 'Database not configured' };
  }

  let newCount = 0;

  const patchUrls = await discoverPatchNoteUrls();
  
  for (const url of patchUrls) {
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
      const title = titleMatch?.[1]?.trim() || 'Patch Notes';
      const date = dateMatch?.[1] || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const compositeId = `${slug}-${date.replace(/\//g, '-')}`;
      
      const { data: existing } = await supabaseAdmin
        .from('patch_notes')
        .select('id')
        .eq('id', compositeId)
        .single();
      
      if (existing) {
        console.log('[PatchNotes] Skipping duplicate:', compositeId);
        continue;
      }
      
      const summaryMatch = html.match(/<p[^>]*>([^<]{50,300})<\/p>/i);
      const summary = summaryMatch?.[1]?.trim() || '';
      
      const imageMatches = html.match(/<img[^>]+src="(https:\/\/[^"]+)"[^>]*>/gi) || [];
      let heroImage: string | null = null;
      
      const headerImgMatch = html.match(/<img[^>]+class="[^"]*blog-header[^"]*"[^>]+src="([^"]+)"/i);
      if (headerImgMatch) {
        heroImage = headerImgMatch[1];
      }
      
      if (!heroImage) {
        const contentImages = imageMatches
          .slice(0, 8)
          .map(m => {
            const srcMatch = m.match(/src="([^"]+)"/);
            return srcMatch?.[1] || '';
          })
          .filter(src => src && !src.includes('blizzard.com/cms/blog_header') && src.match(/\.(jpg|jpeg|png|webp)/i));
        heroImage = contentImages.length > 0 ? contentImages[0] : null;
      }
      
      const bgChanges = extractBattlegroundsSection(html);
      const cleanBgChanges = cleanHtml(bgChanges);
      const storeChanges = cleanBgChanges || summary;

      const { error: upsertError } = await supabaseAdmin
        .from('patch_notes')
        .upsert({
          id: compositeId,
          title,
          date,
          url,
          summary,
          battlegrounds_changes: storeChanges,
          image_url: heroImage,
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
