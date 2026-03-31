# Implementation Plan — Hearthstone Leaderboard Improvements

## 1. Performance: Cache `getLeaderboard` (HIGH)

**File**: `lib/blizzard.ts`

**Problem**: `getLeaderboard` hits the Blizzard API (10 parallel requests) on every page load. No server-side caching.

**Fix**: Wrap `getLeaderboard` in `unstable_cache` with 60s revalidate.

```typescript
// Add import
import { unstable_cache } from 'next/cache';

// Add constant
const CACHE_LEADERBOARD_SECONDS = 60;

// Wrap the existing getLeaderboard function:
export const getLeaderboard = unstable_cache(
  async (region = 'EU', page = 1) => {
    // ... existing function body unchanged ...
  },
  ['leaderboard'],
  { revalidate: CACHE_LEADERBOARD_SECONDS, tags: ['leaderboard'] }
);
```

**Note**: The function body stays exactly the same — just wrap it. The cache key includes region+page automatically via the function args.

---

## 2. Performance: Optimize `getPlayerLiveStats` (HIGH)

**File**: `lib/blizzard.ts` (lines 181-233)

**Problem**: Already checks Supabase history for preferred region (good!), but still scans 8 pages × 25 = 200 players per region. Can reduce pages for the preferred region.

**Fix**: For the preferred region, scan fewer pages (top 250 players = 10 pages). For other regions, scan only 4 pages. Also add a short-lived cache.

```typescript
// Wrap getPlayerLiveStats in unstable_cache
export const getPlayerLiveStats = unstable_cache(
  async (name: string): Promise<BlizzardPlayerLive | null> => {
    // ... existing body, but change PAGES_TO_SCAN logic:
    // For preferred region: PAGES_TO_SCAN = 10 (top 250)
    // For other regions: PAGES_TO_SCAN = 4 (top 100)
  },
  ['player-live'],
  { revalidate: 120, tags: ['player-live'] }  // 2-min cache
);
```

---

## 3. SEO: Dynamic `<html lang>` (HIGH)

**File**: `app/layout.tsx`

**Problem**: `<html lang="en">` is hardcoded even when Italian locale is detected.

**Fix**: Make layout accept locale from a cookie or header, or use a middleware to set it.

**Simplest approach**: Read `Accept-Language` in layout via `headers()`:

```typescript
import { headers } from 'next/headers';
import { detectLocale } from '@/lib/i18n';

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = detectLocale(await headers());
  // ...
  return (
    <html lang={locale === 'it' ? 'it' : 'en'} className={...}>
```

---

## 4. SEO: Add og:image + fix SITE_URL (HIGH)

**File**: `app/api/og/route.tsx` (NEW) + `app/layout.tsx` + `app/page.tsx`

**Create** `app/api/og/route.tsx` — a dynamic OG image generator:

```typescript
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'HS BG Leaderboard';
  const subtitle = searchParams.get('subtitle') || 'Live MMR Rankings';

  return new ImageResponse(
    (
      <div style={{ background: '#0a0c10', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: '#e8a838', letterSpacing: '-0.02em' }}>BG</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: '#e8eaed', marginTop: 8 }}>{title}</div>
        <div style={{ fontSize: 18, color: '#8b8fa3', marginTop: 8 }}>{subtitle}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

**Update** `app/layout.tsx` metadata to reference it:

```typescript
openGraph: {
  // ...existing
  images: [{ url: '/api/og', width: 1200, height: 630 }],
},
twitter: {
  // ...existing
  images: ['/api/og'],
},
```

**Fix SITE_URL**: Replace all `'https://your-domain.com'` placeholders with a proper env var fallback. In `app/page.tsx`, `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`:

```typescript
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.VERCEL_URL || 'localhost:3000'}`;
```

---

## 5. Accessibility: Focus-visible styles (HIGH)

**File**: `app/globals.css`

**Add** after the `::selection` block:

```css
/* ── Focus Visible ── */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

button:focus:not(:focus-visible),
a:focus:not(:focus-visible) {
  outline: none;
}
```

---

## 6. Accessibility: Modal keyboard support (HIGH)

**Files**: `components/PlayerCompare.tsx`, `components/SocialLinksForm.tsx`

Both modals need:
1. `role="dialog"` and `aria-modal="true"` on the overlay div
2. `aria-labelledby` pointing to the modal title
3. Escape key handler to close
4. Focus trap (or at minimum, return focus to trigger on close)

**For PlayerCompare.tsx** — add to the modal overlay div:

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="compare-modal-title"
  style={{ /* existing styles */ }}
  onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
  onKeyDown={e => { if (e.key === 'Escape') handleClose(); }}
>
```

Add `id="compare-modal-title"` to the `<h3>`.

Add useEffect for focus management:

```tsx
useEffect(() => {
  if (open) {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }
}, [open]);
```

Apply the same pattern to `SocialLinksForm.tsx`.

---

## 7. UI: Persistent site-wide navigation bar (MEDIUM)

**File**: `components/SiteNav.tsx` (NEW)

Create a slim top nav component that appears on all pages:

```tsx
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const REGIONS = ['EU', 'US', 'AP', 'CN'];

export default function SiteNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-dim)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
        <Link href="/" style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>
          BG Leaderboard
        </Link>
        <div style={{ display: 'flex', gap: 4 }}>
          {REGIONS.map(r => (
            <Link
              key={r}
              href={`/?region=${r}`}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: isHome && new URLSearchParams(window.location.search).get('region') === r
                  ? 'var(--bg-elevated)' : 'transparent',
                color: isHome && new URLSearchParams(window.location.search).get('region') === r
                  ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {r}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
```

**Integrate** into `app/layout.tsx`:

```tsx
<body className="min-h-full flex flex-col">
  <SiteNav />
  {children}
  <Analytics />
</body>
```

**Then remove** the duplicate header/region selector from `app/page.tsx` since it's now in the nav.

---

## 8. UI: Add footer (MEDIUM)

**File**: `components/SiteFooter.tsx` (NEW)

```tsx
export default function SiteFooter() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-dim)',
      background: 'var(--bg-surface)',
      padding: '24px 20px',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Data from Blizzard Entertainment API · Not affiliated with Blizzard
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <a href="https://github.com/ArKmatty/HSBGLdb" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
```

**Integrate** into `app/layout.tsx`:

```tsx
<body className="min-h-full flex flex-col">
  <SiteNav />
  {children}
  <SiteFooter />
  <Analytics />
</body>
```

---

## 9. Feature: Global player search on leaderboard (MEDIUM)

**File**: `app/page.tsx`

**Problem**: The search in `LeaderboardTable` only filters the current page (10 players).

**Fix**: Add a server-side search that uses the existing `searchPlayers` action. When a player is found, navigate directly to their profile.

Add a search bar above the leaderboard table on `app/page.tsx`:

```tsx
// Add a "Search any player" input that uses searchPlayers server action
// On select, redirect to /player/{name}
```

This can be a client component `GlobalSearch.tsx` that:
- Debounces input
- Calls `searchPlayers(query)` server action
- Shows dropdown of results
- On click, navigates to `/player/{name}`

Place it between the TopMoversWidget and LeaderboardTable.

---

## 10. Feature: Column sorting on leaderboard table (MEDIUM)

**File**: `components/LeaderboardTable.tsx`

**Add** sort state and click handlers to table headers:

```tsx
type SortKey = 'rank' | 'name' | 'mmr' | 'delta';
const [sortKey, setSortKey] = useState<SortKey>('rank');
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

const handleSort = (key: SortKey) => {
  if (sortKey === key) {
    setSortDir(d => d === 'asc' ? 'desc' : 'asc');
  } else {
    setSortKey(key);
    setSortDir(key === 'name' ? 'asc' : 'asc');
  }
};

// Sort filtered data
const sorted = [...filtered].sort((a, b) => {
  let cmp = 0;
  if (sortKey === 'rank') cmp = a.rank - b.rank;
  else if (sortKey === 'name') cmp = a.accountid.localeCompare(b.accountid);
  else if (sortKey === 'mmr') cmp = a.rating - b.rating;
  else if (sortKey === 'delta') {
    const dA = (a.lastRating ? a.rating - a.lastRating : 0);
    const dB = (b.lastRating ? b.rating - b.lastRating : 0);
    cmp = dA - dB;
  }
  return sortDir === 'desc' ? -cmp : cmp;
});
```

Add `aria-sort` to headers and visual sort indicators (▲/▼).

---

## 11. Feature: Page numbers + per-page selector (MEDIUM)

**File**: `app/page.tsx`

**Add** a `perPage` query param and page number buttons:

```tsx
const perPage = parseInt(params.perPage || '10');
const totalPages = 10; // Blizzard API returns top 250, so max 25 pages at 10/page

// Page number buttons
<div style={{ display: 'flex', gap: 4 }}>
  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const pageNum = i + 1;
    return (
      <Link key={pageNum} href={`/?region=${region}&page=${pageNum}&perPage=${perPage}`}
        style={{ /* active/inactive styles */ }}>
        {pageNum}
      </Link>
    );
  })}
</div>

// Per-page selector
<select value={perPage} onChange={e => router.push(`/?region=${region}&page=1&perPage=${e.target.value}`)}>
  <option value="10">10 per page</option>
  <option value="25">25 per page</option>
  <option value="50">50 per page</option>
</select>
```

**Note**: The Blizzard API returns 250 players max (10 pages × 25). The `getLeaderboard` function would need to be updated to respect `perPage` — it currently always returns 10 players per "page" (10 API sub-pages × 1 player each effectively). This may require adjusting the pagination logic in `lib/blizzard.ts`.

---

## 12. Feature: Biggest losers in TopMoversWidget (LOW)

**File**: `lib/stats.ts` + `components/TopMoversWidget.tsx`

**In `lib/stats.ts`**, add a `getTopFallers` function (mirror of `getTopMovers`):

```typescript
export const getTopFallers = unstable_cache(
  async (region: string = 'EU') => {
    // Same query as getTopMovers, but filter diff < 0 and sort ascending
    // ...
    return movers
      .filter(m => m.diff < 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);
  },
  ['top-fallers-cache'],
  { revalidate: 1800, tags: ['fallers'] }
);
```

**In `app/page.tsx`**, fetch both and pass to widget:

```tsx
const [topMovers, topFallers] = await Promise.all([
  getTopMovers(region),
  getTopFallers(region),
]);
```

**In `TopMoversWidget.tsx`**, add a toggle or second section for fallers with red styling.

---

## 13. Security: Security headers (LOW)

**File**: `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## Execution Order

1. **Performance** (#1, #2) — Biggest impact, smallest changes
2. **SEO** (#3, #4) — Quick wins for discoverability
3. **Accessibility** (#5, #6) — Important for all users
4. **UI** (#7, #8) — Makes the site feel polished
5. **Features** (#9, #10, #11, #12) — Enhance functionality
6. **Security** (#13) — Good practice, low risk
