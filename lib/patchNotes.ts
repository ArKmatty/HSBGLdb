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

// ── Configuration ──
const BLIZZARD_NEWS_URL = 'https://hearthstone.blizzard.com/en-us/news';
const BLIZZARD_API_URL = 'https://hearthstone.blizzard.com/en-us/api/blog/articleList';
const BLIZZARD_SEARCH_URL = 'https://hearthstone.blizzard.com/en-us/api/search';
const REQUEST_TIMEOUT = 20000; // 20 seconds
const MAX_PATCH_NOTES = 15;

// ── Known patch note patterns for validation ──
const PATCH_NOTE_PATTERNS = [
  /patch[-\s]?notes/i,
  /\d+\.\d+\.\d+/, // Version numbers like 35.0.0
  /battlegrounds/i,
];

/**
 * Try to discover patch URLs from multiple sources
 * Since Contentful API IDs cause 404s, we try search and HTML scraping
 */
async function discoverPatchNoteUrls(): Promise<string[]> {
  const urls: string[] = [];

  // Strategy 1: Try Blizzard's search API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Search for patch notes
    const searchRes = await fetch(
      `${BLIZZARD_SEARCH_URL}?query=patch+notes&limit=20&locale=en-us`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData?.results) {
        for (const result of searchData.results) {
          if (result?.url && PATCH_NOTE_PATTERNS.some(p => p.test(result.url))) {
            const cleanUrl = result.url.split('?')[0]; // Remove query params
            urls.push(cleanUrl);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[PatchNotes] Search API failed:', err);
  }

  // Strategy 2: Scrape HTML from news page and look for embedded JSON data
  if (urls.length === 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const res = await fetch(BLIZZARD_NEWS_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();
        
        // Try to find embedded JSON data with URLs
        const jsonMatch = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[1]);
            if (data?.props?.pageProps?.articles) {
              for (const article of data.props.pageProps.articles) {
                if (article?.url && PATCH_NOTE_PATTERNS.some(p => p.test(article.url))) {
                  urls.push(article.url);
                }
              }
            }
          } catch {
            console.log('[PatchNotes] Failed to parse embedded JSON');
          }
        }

        // Also try regex matching for all news URLs
        const linkMatches = html.match(/https:\/\/hearthstone\.blizzard\.com\/en-us\/news\/[\w-]+\/[\w-]+/g) || [];
        for (const u of linkMatches) {
          if (PATCH_NOTE_PATTERNS.some(pattern => pattern.test(u))) {
            // Only add if it looks like a working URL (has slug, not just ID)
            const parts = u.split('/');
            const idPart = parts[parts.length - 2];
            // Skip Contentful IDs that cause 404s
            if (idPart && !idPart.startsWith('blt')) {
              urls.push(u);
            }
          }
        }
      }
    } catch (err) {
      console.error('[PatchNotes] HTML scraping failed:', err);
    }
  }

  // Strategy 3: Use hardcoded recent URLs as last resort
  if (urls.length === 0) {
    console.log('[PatchNotes] All discovery strategies failed, using known recent URLs');
    const knownUrls = [
      'https://hearthstone.blizzard.com/en-us/news/24271854/35-0-3-patch-notes',
      'https://hearthstone.blizzard.com/en-us/news/24267727/35-0-patch-notes',
      'https://hearthstone.blizzard.com/en-us/news/24242744/34-6-2-patch-notes',
      'https://hearthstone.blizzard.com/en-us/news/24242740/34-6-patch-notes',
      'https://hearthstone.blizzard.com/en-us/news/24244400/34-4-2-patch-notes',
      'https://hearthstone.blizzard.com/en-us/news/24245106/34-4-patch-notes',
      'https://hearthstone.blizzard.com/en-us/news/24250382/34-2-2-patch-notes',
      'https://hearthstone.blizzard.com/en-us/news/24244423/34-2-patch-notes-battlegrounds-arena-and-gameplay-updates',
    ];
    for (const u of knownUrls) {
      urls.push(u);
    }
  }

  // Remove duplicates and limit
  const uniqueUrls = [...new Set(urls)].slice(0, MAX_PATCH_NOTES);
  console.log(`[PatchNotes] Discovered ${uniqueUrls.length} patch note URLs`);
  if (uniqueUrls.length > 0) {
    console.log('[PatchNotes] Sample URLs:', uniqueUrls.slice(0, 3));
  } else {
    console.warn('[PatchNotes] No working URLs found after trying all strategies');
  }
  return uniqueUrls;
}

/**
 * Extract Battlegrounds section from patch notes HTML
 * Uses multiple strategies for robustness
 */
function extractBattlegroundsSection(html: string): string {
  // Strategy 1: Find H2/H3 with "Battlegrounds" and capture until next heading
  const headingMatch = html.match(
    /<h[23][^>]*>[\s\S]*?Battlegrounds[\s\S]*?<\/h[23]>([\s\S]*?)(?=<h[23]|$)/i
  );

  if (headingMatch && headingMatch[1]) {
    return headingMatch[1].trim();
  }

  // Strategy 2: Look for "Battlegrounds" in bold/strong text
  const boldMatch = html.match(
    /<strong[^>]*>[\s\S]*?Battlegrounds[\s\S]*?<\/strong>[\s\S]*?(?:<br\s*\/?>|<\/p>|<\/div>)([\s\S]*?)(?=<strong|<h|$)/i
  );

  if (boldMatch && boldMatch[1]) {
    return boldMatch[1].trim();
  }

  // Strategy 3: Look for bullet lists near "Battlegrounds"
  const listMatch = html.match(
    /Battlegrounds[\s\S]*?(?:<ul|<ol)[\s\S]*?(?:<\/ul|<\/ol)/i
  );

  if (listMatch) {
    return listMatch[0].trim();
  }

  return '';
}

/**
 * Clean HTML content to plain text
 * Preserves line breaks and basic formatting
 */
function cleanHtml(html: string): string {
  return html
    // Remove script/style tags completely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Convert links to text
    .replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1')
    // Remove images
    .replace(/<img[^>]*>/gi, '')
    // Convert <br> and </p> to newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    // Remove all other tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Validate that a patch note has meaningful content
 */
function validatePatchNote(title: string, summary: string, bgChanges: string): boolean {
  const hasTitle = Boolean(title && title.length > 5 && title !== 'Patch Notes');
  const hasContent = Boolean(
    (summary && summary.length > 20) || (bgChanges && bgChanges.length > 20)
  );
  return hasTitle && hasContent;
}

/**
 * Extract metadata from patch notes HTML
 */
function extractMetadata(html: string, url: string): { title: string; date: string; summary: string; imageUrl: string | null } {
  // Extract title
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    || html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
    || html.match(/<title>([^<]+)<\/title>/i);

  const title = titleMatch?.[1]?.trim().replace(/\s*\|\s*Hearthstone.*$/i, '') || 'Patch Notes';

  // Extract date
  const dateMatch = html.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
    || html.match(/(\d{4}-\d{2}-\d{2})/)
    || html.match(/<time[^>]+datetime="([^"]+)"/i);

  const date = dateMatch?.[1] || new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });

  // Extract summary/description
  const summaryMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
    || html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
    || html.match(/<p[^>]*>([^<]{50,300})<\/p>/i);

  const summary = summaryMatch?.[1]?.trim() || '';

  // Extract hero image
  let imageUrl: string | null = null;
  const imageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  if (imageMatch) {
    imageUrl = imageMatch[1];
  }

  return { title, date, summary, imageUrl };
}

// ── Public API ──

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
      .limit(limit * 2); // Fetch more to allow deduplication

    if (error) throw error;

    if (existing && existing.length > 0) {
      // Sort by date properly
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

      // Deduplicate by date - keep the most complete entry for each date
      const dateMap = new Map<string, PatchNote>();
      for (const patch of sorted) {
        const normalizedDate = patch.date;
        if (!dateMap.has(normalizedDate) ||
            (patch.battlegrounds_changes?.length > (dateMap.get(normalizedDate)?.battlegrounds_changes?.length || 0))) {
          dateMap.set(normalizedDate, patch);
        }
      }

      // Convert back to array and limit
      return Array.from(dateMap.values()).slice(0, limit);
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
    return { success: false, error: 'Database not configured' };
  }

  let newCount = 0;
  let errorCount = 0;
  const patchUrls = await discoverPatchNoteUrls();

  if (patchUrls.length === 0) {
    console.warn('[PatchNotes] No patch URLs discovered');
    return { success: false, error: 'No patch notes found' };
  }

  for (const url of patchUrls) {
    try {
      console.log(`[PatchNotes] Fetching (${patchUrls.indexOf(url) + 1}/${patchUrls.length}):`, url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.log(`[PatchNotes] HTTP ${res.status} for ${url}`);
        errorCount++;
        continue;
      }

      const html = await res.text();

      // Extract metadata
      const { title, date, summary, imageUrl } = extractMetadata(html, url);

      // Generate composite ID
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const compositeId = `${slug}-${date.replace(/\//g, '-')}`;

      // Check for duplicates by ID or date
      const { data: existingById } = await supabaseAdmin
        .from('patch_notes')
        .select('id')
        .eq('id', compositeId)
        .single();

      if (existingById) {
        console.log('[PatchNotes] Skipping duplicate (by ID):', compositeId);
        continue;
      }

      // Also check for same-date duplicates
      const { data: existingByDate } = await supabaseAdmin
        .from('patch_notes')
        .select('id')
        .eq('date', date)
        .single();

      if (existingByDate) {
        console.log('[PatchNotes] Skipping duplicate (by date):', date);
        continue;
      }

      // Extract battlegrounds section
      const bgChanges = extractBattlegroundsSection(html);
      const cleanBgChanges = cleanHtml(bgChanges);

      // Validate content
      if (!validatePatchNote(title, summary, cleanBgChanges)) {
        console.warn('[PatchNotes] Skipping invalid content:', url);
        errorCount++;
        continue;
      }

      // Save to database
      const { error: upsertError } = await supabaseAdmin
        .from('patch_notes')
        .upsert({
          id: compositeId,
          title,
          date,
          url,
          summary,
          battlegrounds_changes: cleanBgChanges,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (upsertError) {
        console.error('[PatchNotes] Upsert error:', upsertError);
        errorCount++;
      } else {
        console.log('[PatchNotes] Saved:', title);
        newCount++;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[PatchNotes] Error fetching', url, ':', errorMessage);
      errorCount++;
    }
  }

  console.log(`[PatchNotes] Complete: ${newCount} saved, ${errorCount} errors`);
  return {
    success: newCount > 0 || errorCount === 0,
    count: newCount,
  };
}

export async function getPatchNotes(limit = 10): Promise<PatchNote[]> {
  const cached = await fetchPatchNotes(limit);

  if (cached.length === 0) {
    await refreshPatchNotes();
    return fetchPatchNotes(limit);
  }

  return cached;
}
