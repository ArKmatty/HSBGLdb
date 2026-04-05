# QWEN.md — Hearthstone Battlegrounds Leaderboard

## Project Overview

**Hearthstone Battlegrounds Leaderboard** is a live MMR (Matchmaking Rating) ranking platform for Hearthstone Battlegrounds players across EU, US, AP, and CN regions. Built with Next.js 16 (App Router), it provides real-time player rankings, MMR history tracking, Twitch integration, and player comparison features.

### Key Features
- **Regional leaderboards** with pagination (100 players per page)
- **Top Movers** widget showing fastest-climbing players in last 24 hours
- **Player profiles** with MMR history charts, live rank tracking, and stats (peak rating, 7-day trend, match counts)
- **Twitch integration** displaying live stream status and viewer counts
- **i18n support** with automatic English/Italian detection
- **Player comparison** tool for side-by-side analysis
- **Watchlist** functionality for tracking favorite players
- **Admin panel** for managing social links and data

## Tech Stack

### Core
- **Next.js 16** (App Router, Server Components, Server Actions)
- **React 19** with TypeScript (strict mode, ES2017 target)
- **Tailwind CSS v4** via PostCSS (primarily uses inline styles with CSS custom properties)

### Data & APIs
- **Supabase** — Primary database for player history, social mappings, and watchlists
  - Client-safe anon key for user-facing queries
  - Service role key for server-only operations (bypasses RLS)
- **Blizzard API** — Live leaderboard data (separate endpoints for CN: `webapi.blizzard.cn`)
- **Twitch API** — Stream status and viewer counts

### Libraries
- **Recharts** — MMR history visualization and charts
- **Lucide React** — Icon library
- **Zod** — Schema validation
- **@sentry/nextjs** — Error tracking and performance monitoring
- **@vercel/analytics** — Usage analytics
- **@vercel/speed-insights** — Performance metrics

### Testing
- **Vitest** with jsdom environment (configured, minimal test coverage currently)

## Project Structure

```
hearthstone-leaderboard/
├── app/                    # Next.js App Router
│   ├── actions/            # Server Actions ("use server" directive)
│   ├── admin/              # Admin pages (protected)
│   ├── api/                # API routes (cron jobs, webhooks)
│   ├── compare/            # Player comparison pages
│   ├── patch-notes/        # Patch notes pages + co-located components
│   ├── player/             # Player detail pages
│   │   └── [name]/         # Dynamic routes (page.tsx, layout.tsx, not-found.tsx)
│   ├── error.tsx           # Error boundary
│   ├── global-error.tsx    # Global error boundary
│   ├── layout.tsx          # Root layout with metadata
│   ├── loading.tsx         # Loading skeleton UI
│   ├── page.tsx            # Home page (leaderboard)
│   ├── robots.ts           # robots.txt generator
│   └── sitemap.ts          # sitemap.xml generator
├── components/             # React components (17 total)
├── lib/                    # Shared utilities and types
│   ├── blizzard.ts         # Blizzard API client with caching & retry logic
│   ├── supabase.ts         # Supabase client configurations
│   ├── stats.ts            # MMR statistics and trend calculations
│   ├── ingest.ts           # Data ingestion from API to database
│   ├── i18n.ts             # Internationalization (EN/IT)
│   ├── patchNotes.ts       # Patch note scraping utilities
│   ├── types.ts            # Shared TypeScript interfaces
│   └── __tests__/          # Unit tests
├── public/                 # Static assets
├── scripts/                # Dev-only scripts (excluded from lint)
├── supabase/               # Database migrations and configuration
└── .github/workflows/      # GitHub Actions (cron sync, patch notes sync, cache warming)
```

## Building and Running

### Prerequisites
- Node.js 18+ (check `.nvmrc` if present)
- Environment variables configured (copy `.env.example` to `.env.local`)

### Environment Variables

**Client-safe** (exposed to browser):
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

**Server-only** (never exposed to client):
```env
BLIZZARD_CLIENT_ID=
BLIZZARD_CLIENT_SECRET=
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
CRON_SECRET=              # For protecting cron endpoints
ADMIN_SECRET=             # For admin authentication
CN_SEASON_ID=             # China region season identifier
SUPABASE_SERVICE_ROLE_KEY=
SENTRY_ORG=               # Optional, for error tracking
SENTRY_PROJECT=           # Optional, for error tracking
```

### Development

```bash
# Install dependencies
npm install

# Start development server (localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint

# Run tests (Vitest)
npm test              # Watch mode
npm run test:run      # Single run
```

### Deployment

Deployed on **Vercel**. Pushes to `main` branch trigger automatic deployments.

**GitHub Workflows:**
- `cron-sync.yml` — Automated leaderboard data synchronization
- `patch-notes-sync.yml` — Patch notes scraping automation
- `warm-cache.yml` — Cache warming after deployments

## Architecture Patterns

### Data Flow

1. **Blizzard API** → Cached via `unstable_cache` with revalidation
2. **Supabase** → Stores player history, social links, watchlists
3. **Server Components** → Fetch data with parallel `Promise.all` calls
4. **Server Actions** → Mutations with `revalidatePath()` for cache invalidation
5. **Client Components** → Receive data as props, handle interactivity

### Caching Strategy

- **Leaderboard**: 180s (3 minutes) via `unstable_cache` with tags
- **Player live stats**: 120s (2 minutes)
- **Top movers/fallers**: 1800s (30 minutes, computed stats change slowly)
- **External API calls**: `fetch` with `{ next: { revalidate: SECONDS } }`
- **Retry logic**: Exponential backoff (300ms → 600ms → 1200ms) for unreliable API calls
- **In-memory maps** for rate-limited operations (admin login throttling)

### Error Handling

- Server actions return typed envelopes: `{ success: boolean; data?: T; error?: string }`
- Never throw errors to client from server actions
- Use `try/catch` around all external API calls
- Log with context prefixes: `[Blizzard]`, `[Supabase]`, `[Ingest]`, `[Perf]`
- Graceful degradation: return empty arrays/objects on failure

### Regional Handling

- **EU, US, AP**: Standard Blizzard API (`hearthstone.blizzard.com`)
- **CN**: Separate API (`webapi.blizzard.cn`) with different endpoints, stored in database via cron sync
- **Multi-region**: Combined leaderboard with cross-region sorting
- Region validation: `['EU', 'US', 'AP', 'CN']`

### i18n

- Dictionary-based translations in `lib/i18n.ts`
- `Locale = 'en' | 'it'`
- Server-side detection via `Accept-Language` header
- Client-side detection via `navigator.language`
- Components receive `locale: Locale` prop, access via `const t = translations[locale]`

## Development Conventions

### TypeScript
- **Strict mode enabled**, no `any` unless unavoidable
- Define interfaces for all data shapes (see `lib/types.ts`)
- Use `Readonly<>` for component props when appropriate
- Target ES2017
- Type async action returns consistently

### Imports
- Use `@/` path alias for `lib/` and `app/` imports
- Relative paths for sibling/nearby files
- Group: Next.js/core → external libraries → internal modules
- Default exports for components; named exports for utilities/actions

### Styling
- **100% inline styles** via `style={{ ... }}` — no Tailwind utility classes in components
- All colors reference CSS custom properties (`--bg-base`, `--accent`, etc.) — never hardcode hex
- Exception: `global-error.tsx` hardcodes hex (renders before CSS loads)
- Hover effects via `onMouseEnter`/`onMouseLeave` mutating `e.currentTarget.style`
- Custom CSS classes only for animations: `.animate-fade-in`, `.animate-shimmer`, `.animate-spin`, `.pagination-btn`, `.leaderboard-row`

### Components
- Server Components by default; add `"use client"` only for hooks (`useState`, `useEffect`, `useRouter`)
- Use design tokens from `:root` CSS variables
- Data interfaces defined locally in component files (exception: shared types in `lib/`)
- Use `Promise.all` for parallel data fetching
- Search params use Next.js 15+ `Promise<{...}>` pattern — always `await` before accessing

### Server Actions
- Files in `app/actions/` must begin with `"use server"` directive
- Return typed envelopes: `{ success: boolean; data?: T; error?: string }`
- Use `revalidatePath()` after mutations
- Admin actions use cookie-based auth with HMAC-signed session tokens
- Sanitize user input before database operations

### Accessibility
- Modal dialogs must trap focus (use `useFocusTrap` hook)
- All interactive elements need `aria-label` when no visible text
- Modal overlays restore focus to trigger element on close
- Add `role="dialog"` and `aria-modal="true"` to modal containers
- Respect `prefers-reduced-motion` (animations disabled via CSS)

### Naming Conventions
- **Components**: PascalCase (`LeaderboardTable`, `TopMoversWidget`)
- **Functions/utilities**: camelCase with verb prefixes (`getLeaderboard`, `backgroundIngest`)
- **Files**: Match export — `ComponentName.tsx` for components, `utilityName.ts` for libs
- **Server actions**: camelCase verbs (`getPlayerHistory`, `getTwitchStatusForPlayer`)
- **CSS variables**: kebab-case with namespace (`--bg-base`, `--text-primary`)
- **Constants**: UPPER_SNAKE_CASE (`REVALIDATE_SECONDS`, `CACHE_LEADERBOARD_SECONDS`)
- **Interfaces/types**: PascalCase

## Key Files

| File | Purpose |
|------|---------|
| `lib/blizzard.ts` | Blizzard API client with caching, retry logic, multi-region support |
| `lib/supabase.ts` | Supabase client configurations (anon + service role) |
| `lib/stats.ts` | MMR statistics, movers/fallers calculations |
| `lib/i18n.ts` | Internationalization dictionaries and detection |
| `app/page.tsx` | Home page with leaderboard, movers widget, SEO content |
| `app/layout.tsx` | Root layout with metadata, JSON-LD, analytics |
| `app/actions/*.ts` | Server actions for data fetching and mutations |
| `next.config.ts` | Next.js config with Sentry integration, security headers, image optimization |
| `instrumentation.ts` | Sentry initialization |

## Performance Considerations

- **Parallel fetching**: Use `Promise.all` in Server Components for independent data sources
- **Retry logic**: Exponential backoff (300ms → 600ms → 1200ms) for unreliable API calls
- **Cache tags**: Use `{ tags: ['leaderboard'] }` for targeted invalidation with `revalidateTag()`
- **Bundle optimization**: `optimizePackageImports` for `recharts` and `lucide-react`
- **Font optimization**: `Inter` via `next/font/google` with `display: 'swap'`
- **Image optimization**: Configured remote patterns for Blizzard CDN assets

## Security

- Environment variable validation at module load
- Never log or expose secret values
- Security headers configured in `next.config.ts`:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security`
  - Content Security Policy (CSP)
- Admin auth via HMAC-signed session tokens in cookies
- Cron endpoints protected with `CRON_SECRET` Bearer token
- Input sanitization (strip HTML from usernames, etc.)

## Troubleshooting

### Common Issues

**Blizzard API failures:**
- Check retry logs: `[Blizzard] Retry X/3 after Xms`
- CN region data comes from database (synced via cron), not live API
- Verify `BLIZZARD_CLIENT_ID` and `BLIZZARD_CLIENT_SECRET` are set

**Supabase connection errors:**
- Validate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check RLS policies for anon key queries
- Service role queries bypass RLS (use `supabaseAdmin`)

**Cache staleness:**
- Manual cache invalidation: `revalidateTag('leaderboard')` or `revalidatePath('/path')`
- Cache warming workflow via `.github/workflows/warm-cache.yml`

**Build failures:**
- Run `npm run lint` to catch TypeScript errors
- Check for unused imports or variables
- Verify all environment variables are set (use `.env.example` as template)

## Future Improvements

1. **Expand test coverage** — Currently minimal, consider adding integration tests
2. **Monitor CN API reliability** — Track retry frequency in logs
3. **Add player achievement system** — Leverage `AchievementBadges.tsx` component
4. **Optimize database indexes** — Review `supabase/migrations/` for query patterns
5. **Enhance mobile responsiveness** — Some elements hidden on small screens (`.hide-mobile`)
6. **Add e2e tests** — Consider Playwright for critical user flows
