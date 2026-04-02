<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Hearthstone Leaderboard

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint (eslint-config-next core-web-vitals + typescript)
```

**No test framework** is currently set up. If adding tests, prefer Vitest and document the command here. To run a single test file with Vitest: `npx vitest path/to/test.test.ts`.

## Architecture

- **App Router** (`app/`) with Server Components by default
- **Server Actions** (`app/actions/*.ts`) marked with `"use server"`
- **Client Components** (`components/*.tsx`) marked with `"use client"`
- **Data layer**: Supabase — `supabase` (anon key, client-safe) + `supabaseAdmin` (service role, server-only) + Blizzard API (`lib/blizzard.ts`)
- **Caching**: `unstable_cache` from `next/cache` with explicit revalidate times
- **Path aliases**: `@/*` maps to project root (configured in `tsconfig.json`)
- **Styling**: CSS design tokens in `app/globals.css` + Tailwind CSS v4 via PostCSS
- **i18n**: `lib/i18n.ts` for internationalization
- **Charts**: `recharts` for data visualization; `lucide-react` for icons
- **Analytics**: `@vercel/analytics` for usage tracking
- **Font**: `Inter` via `next/font/google` with `display: 'swap'`
- **SEO**: Dynamic metadata via `generateMetadata`, JSON-LD structured data in layout, security headers in `next.config.ts`

## Project Structure

```
app/              # Next.js App Router
  actions/        # Server actions ("use server")
  admin/          # Admin pages
  api/            # API routes
  compare/        # Player comparison pages
  patch-notes/    # Patch notes pages + co-located components
  player/         # Player detail pages
    [name]/       # Dynamic player routes (page.tsx, layout.tsx, not-found.tsx)
  error.tsx       # Error boundary
  global-error.tsx # Global error boundary
  layout.tsx      # Root layout
  loading.tsx     # Loading UI
  page.tsx        # Home page
  robots.ts       # robots.txt generator
  sitemap.ts      # sitemap.xml generator
components/       # React components
  LeaderboardTable.tsx
  TopMoversWidget.tsx
  PlayerCompare.tsx
  AchievementBadges.tsx
  DataFreshness.tsx
  RecentSearches.tsx
  ScrollToTop.tsx
  SocialLinksForm.tsx
  SiteNav.tsx
  SiteFooter.tsx
  EmptyState.tsx
  Skeleton.tsx
lib/              # Shared utilities
  blizzard.ts     # Blizzard API client
  supabase.ts     # Supabase client
  stats.ts        # Statistics calculations
  ingest.ts       # Data ingestion
  i18n.ts         # Internationalization
  patchNotes.ts   # Patch note scraping
public/           # Static assets
scripts/          # Dev-only scripts (excluded from lint)
```

## Code Style

### Imports
- Use absolute paths with `@/` alias for `lib/` and `app/` imports (e.g., `import { supabase } from '@/lib/supabase'`)
- Use relative paths for sibling/nearby files (e.g., `import LeaderboardTable from '../components/LeaderboardTable'`)
- Group imports in order: Next.js/core → external libraries → internal modules
- Default exports for components; named exports for utilities and server actions

### TypeScript
- **Strict mode enabled**, target ES2017 — no `any` unless unavoidable (e.g., Twitch API responses)
- Define interfaces for data shapes (e.g., `interface Player { rank: number; accountid: string; rating: number }`)
- Use `Readonly<>` for component props when appropriate
- Type async action return values consistently (e.g., `{ success: boolean; data?: T; error?: string }`)
- Use type assertions sparingly; prefer type guards or proper typing

### Formatting
- 2-space indentation (no tabs)
- Semicolons required at end of statements
- Double quotes for strings (single quotes acceptable in JSX attributes)
- Trailing commas in multi-line objects/arrays
- Blank line between function declarations and logical blocks

### Naming Conventions
- **Components**: PascalCase (`LeaderboardTable`, `TopMoversWidget`)
- **Functions/utilities**: camelCase with verb prefixes (`getLeaderboard`, `backgroundIngest`)
- **Files**: match export — `ComponentName.tsx` for components, `utilityName.ts` for libs
- **Server actions**: camelCase verbs (`getPlayerHistory`, `getTwitchStatusForPlayer`)
- **CSS variables**: kebab-case with namespace (`--bg-base`, `--text-primary`, `--accent`)
- **Constants**: UPPER_SNAKE_CASE (`REVALIDATE_SECONDS`, `COOLDOWN_MS`)
- **Interfaces/types**: PascalCase

### Components
- Server Components by default; add `"use client"` only when using hooks (`useState`, `useEffect`, `useRouter`)
- Inline styles preferred over Tailwind utility classes (design tokens in `globals.css`)
- Use design tokens from `:root` CSS variables — never hardcode colors (exception: `global-error.tsx` hardcodes hex since it renders before CSS loads)
- Props typed inline or via interface: `{ players: Player[]; twitchStatuses?: Record<string, any> }`
- Data interfaces are defined **locally** in component files, not shared across components (exception: shared types in `lib/`)
- Use `Promise.all` for parallel data fetching in Server Components
- Search params use Next.js 15+ `Promise<{...}>` pattern — always `await` them before accessing

### Error Handling
- Server actions return `{ success: false, error: string }` on failure — never throw to client
- Use `try/catch` around external API calls (Blizzard, Twitch, Supabase)
- Log errors with `console.error` with context prefix (e.g., `[Ingest]`, `[Perf]`, `[Supabase]`)
- Graceful degradation: return empty arrays/objects rather than crashing
- Validate user input at action boundaries before processing
- `error.tsx` — client component with `reset()` and error logging
- `global-error.tsx` — wraps `<html>`/`<body>`, hardcodes hex colors (CSS not yet loaded)
- `loading.tsx` — skeleton UI with `animation: 'pulse 2s infinite'`

### Caching Strategy
- `unstable_cache` for expensive computations with explicit `revalidate` seconds
- `fetch` with `{ next: { revalidate: SECONDS } }` for external APIs
- In-memory cooldown maps for rate-limited operations (see `app/actions/socials.ts` for login throttling)
- Cache tags for targeted revalidation (e.g., `{ tags: ['movers'] }`)
- Document cache durations in comments

### Styling Details
- **100% inline styles** via `style={{ ... }}` — no Tailwind utility classes in components
- All colors reference CSS custom properties — never hardcode hex values (exception: `global-error.tsx` hardcodes hex since it renders before CSS loads)
- Hover effects via `onMouseEnter`/`onMouseLeave` mutating `e.currentTarget.style`
- Use `lucide-react` for icons with `size` prop; `recharts` for charts
- Custom CSS classes only for animations/responsive: `.animate-fade-in`, `.hide-mobile`, `.leaderboard-row`, `.animate-spin`, `.animate-shimmer`, `.pagination-btn`
- Layout-level Tailwind classes acceptable (e.g., `className="min-h-full flex flex-col"` in `layout.tsx`)

### Server Actions
- All files in `app/actions/` must begin with `"use server"` directive
- Return typed envelopes: `{ success: boolean; data?: T; error?: string }`
- Use `revalidatePath()` after mutations to invalidate cached pages
- Admin actions use cookie-based auth (`admin_auth`) with HMAC-signed session tokens (never store plaintext secrets)
- Rate-limited login (5 attempts, 15min lockout) via in-memory Map
- Sanitize user input (e.g., strip HTML from usernames) before database operations

### API Routes
- Protect cron endpoints with `CRON_SECRET` Bearer token auth
- Use `cache: 'no-store'` for fresh data in API handlers
- OG images use edge runtime with `ImageResponse` from `next/og`
- CN region uses separate API endpoint (`webapi.blizzard.cn`) — handle in cron sync

### i18n
- Dictionary-based: `lib/i18n.ts` with `Locale = 'en' | 'it'`
- Components receive `locale: Locale` prop; access via `const t = translations[locale]`
- Server-side detection via `Accept-Language` header; client-side via `navigator.language`

### Environment Variables
- **Client-safe**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
- **Server-only**: `BLIZZARD_CLIENT_ID/SECRET`, `TWITCH_CLIENT_ID/SECRET`, `CRON_SECRET`, `ADMIN_SECRET`, `CN_SEASON_ID`, `SUPABASE_SERVICE_ROLE_KEY`
- Validate required vars at module load; never log or expose secret values
- Use placeholder fallbacks in development (see `.env.example`)

### Accessibility
- Modal dialogs must trap focus — use `useFocusTrap` hook from `lib/useFocusTrap.ts`
- All interactive elements need `aria-label` when no visible text is present
- Modal overlays should restore focus to the trigger element on close
- Add `role="dialog"` and `aria-modal="true"` to modal containers

### Git
- Do not commit `.env.local` or any secrets
- Commit messages: imperative mood, concise (e.g., "Add pagination to leaderboard")
- Keep commits focused on single logical changes
