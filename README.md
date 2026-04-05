# Hearthstone Battlegrounds Leaderboard

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06b6d4)
![License](https://img.shields.io/badge/license-MIT-green)

Live MMR (Matchmaking Rating) rankings for Hearthstone Battlegrounds players across **EU**, **US**, **AP**, and **CN** regions. Track real-time rating changes, historical trends, Twitch streams, and player performance — all updated automatically every few minutes.

## ✨ Features

- **Regional Leaderboards** — Browse top 100 players per region with pagination (EU, US, AP, CN)
- **Top Movers** — Discover the fastest-climbing players and biggest drops in the last 24 hours
- **Player Profiles** — MMR history charts, live rank tracking, peak rating, 7-day trends, and match statistics
- **Twitch Integration** — See which ranked players are currently streaming with live viewer counts
- **Player Comparison** — Side-by-side analysis of two players' MMR histories
- **Watchlist** — Track your favorite players and get quick access from the homepage
- **Multi-Region Support** — Combined leaderboard view across all competitive regions
- **i18n** — Automatic English/Italian detection based on browser language
- **Recent Searches** — Quick access to players you've looked up before
- **Admin Panel** — Manage social links, player data, and pending submissions
- **Automated Data Sync** — GitHub Actions cron jobs keep leaderboard and patch notes up to date

## 🚀 Tech Stack

### Core
- **[Next.js 16](https://nextjs.org/)** — App Router, Server Components, Server Actions
- **[React 19](https://react.dev/)** — Component-based UI with TypeScript strict mode
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Design token-driven styling via CSS custom properties

### Data & APIs
- **[Supabase](https://supabase.com/)** — Player history, social mappings, and watchlists
  - Anon key for client-safe queries (RLS-protected)
  - Service role key for server-only operations (bypasses RLS)
- **Blizzard API** — Live leaderboard data (separate endpoints for CN: `webapi.blizzard.cn`)
- **Twitch API** — Stream status and viewer counts

### Libraries
- **[Recharts](https://recharts.org/)** — MMR history visualization and charts
- **[Lucide React](https://lucide.dev/)** — Consistent icon library
- **[Zod](https://zod.dev/)** — Schema validation for server actions
- **[@sentry/nextjs](https://sentry.io/)** — Error tracking and performance monitoring
- **[@vercel/analytics](https://vercel.com/analytics)** — Usage analytics
- **[@vercel/speed-insights](https://vercel.com/speed-insights)** — Real-world performance metrics

### Testing & CI
- **[Vitest](https://vitest.dev/)** — Unit testing with jsdom environment
- **GitHub Actions** — Automated cron syncs, patch notes scraping, and cache warming

## 📁 Project Structure

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
│   ├── layout.tsx          # Root layout with metadata & JSON-LD
│   ├── loading.tsx         # Loading skeleton UI
│   ├── page.tsx            # Home page (leaderboard)
│   ├── robots.ts           # robots.txt generator
│   └── sitemap.ts          # sitemap.xml generator
├── components/             # React components (17 total)
├── lib/                    # Shared utilities and types
│   ├── blizzard.ts         # Blizzard API client with caching & retry logic
│   ├── supabase.ts         # Supabase client configurations (anon + admin)
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

## 🛠 Getting Started

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm**, **pnpm**, or **yarn**
- A **Supabase** project with configured tables
- **Blizzard API** client credentials
- **Twitch API** client credentials (optional, for stream status)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/hearthstone-leaderboard.git
cd hearthstone-leaderboard

# Install dependencies
npm install

# Copy environment variables and configure them
cp .env.example .env.local
```

### Environment Variables

**Client-safe** (exposed to browser via `NEXT_PUBLIC_` prefix):
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

**Server-only** (never exposed to client):
```env
# Blizzard API
BLIZZARD_CLIENT_ID=
BLIZZARD_CLIENT_SECRET=

# Twitch API
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

# Security
CRON_SECRET=              # For protecting cron endpoints
ADMIN_SECRET=             # For admin authentication

# Configuration
CN_SEASON_ID=             # China region season identifier
SUPABASE_SERVICE_ROLE_KEY=

# Optional (for error tracking)
SENTRY_ORG=
SENTRY_PROJECT=
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app. The page auto-reloads as you edit files.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on `localhost:3000` |
| `npm run build` | Production build with TypeScript compilation |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint (core-web-vitals + typescript rules) |
| `npm test` | Run tests in watch mode with Vitest |
| `npm run test:run` | Run tests once with Vitest |

## 🏗 Architecture

### Data Flow

```
Blizzard API ──→ unstable_cache ──→ Server Components
                                            ↓
                                    Parallel Promise.all
                                            ↓
                                    React Components ← Twitch API
                                            ↓
                                  Client Interactivity
```

1. **Blizzard API** data is cached via `unstable_cache` with configurable revalidation times
2. **Supabase** stores player history, social links, and watchlists
3. **Server Components** fetch data with parallel `Promise.all` calls for optimal performance
4. **Server Actions** handle mutations with `revalidatePath()` for cache invalidation
5. **Client Components** receive data as props and manage interactivity via React hooks

### Caching Strategy

| Data Type | Duration | Method |
|-----------|----------|--------|
| Leaderboard | 180s (3 min) | `unstable_cache` with `tags: ['leaderboard']` |
| Player live stats | 120s (2 min) | `unstable_cache` with `tags: ['player-live']` |
| Top movers/fallers | 1800s (30 min) | Computed stats (change slowly) |
| External API calls | 60–120s | `fetch` with `{ next: { revalidate } }` |
| Retry logic | Exponential backoff | 300ms → 600ms → 1200ms (3 attempts max) |

### Error Handling

- Server actions return typed envelopes: `{ success: boolean; data?: T; error?: string }`
- Never throw errors to client from server actions
- `try/catch` around all external API calls with contextual logging (`[Blizzard]`, `[Supabase]`, `[Ingest]`)
- Graceful degradation: return empty arrays/objects on failure
- Error boundaries at page level (`error.tsx`, `global-error.tsx`)

### Regional Handling

- **EU, US, AP**: Standard Blizzard API (`hearthstone.blizzard.com`)
- **CN**: Separate API (`webapi.blizzard.cn`) — data stored in database via cron sync for reliability
- **Multi-region**: Combined leaderboard with cross-region sorting and ranking

### i18n

- Dictionary-based translations in `lib/i18n.ts`
- `Locale = 'en' | 'it'`
- Server-side detection via `Accept-Language` header
- Client-side detection via `navigator.language`
- Components receive `locale: Locale` prop; access via `const t = translations[locale]`

## 🔒 Security

- **Environment variables** validated at module load
- **Never log or expose** secret values
- **Security headers** configured in `next.config.ts`:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security`
  - Content Security Policy (CSP)
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Admin auth** via HMAC-signed session tokens in cookies
- **Cron endpoints** protected with `CRON_SECRET` Bearer token
- **Input sanitization** (strip HTML from usernames, etc.)

## ♿ Accessibility

- Skip-to-content link on all pages
- Modal dialogs trap focus via `useFocusTrap` hook
- All interactive elements include `aria-label` when no visible text
- Modal overlays restore focus to trigger element on close
- Respects `prefers-reduced-motion` (animations disabled via CSS)
- Semantic HTML structure with proper heading hierarchy

## 🚀 Deployment

Deployed on **[Vercel](https://vercel.com)**. Pushes to `main` branch trigger automatic deployments.

### GitHub Actions Workflows

| Workflow | Purpose |
|----------|---------|
| `cron-sync.yml` | Automated leaderboard data synchronization |
| `patch-notes-sync.yml` | Patch notes scraping automation |
| `warm-cache.yml` | Cache warming after deployments |

## 🎨 Styling Conventions

- **100% inline styles** via `style={{ ... }}` — no Tailwind utility classes in components
- All colors reference **CSS custom properties** (`--bg-base`, `--accent`, `--text-primary`, etc.)
- **Never hardcode hex values** (exception: `global-error.tsx` hardcodes hex since it renders before CSS loads)
- Hover effects via `onMouseEnter`/`onMouseLeave` mutating `e.currentTarget.style`
- Custom CSS classes only for animations: `.animate-fade-in`, `.animate-shimmer`, `.animate-spin`, `.pagination-btn`, `.leaderboard-row`

## 📝 Code Conventions

### TypeScript
- **Strict mode enabled**, target ES2017
- No `any` unless unavoidable (e.g., Twitch API responses)
- Define interfaces for all data shapes (see `lib/types.ts`)
- Use `Readonly<>` for component props when appropriate

### Imports
- Use `@/` path alias for `lib/` and `app/` imports
- Relative paths for sibling/nearby files
- Group: Next.js/core → external libraries → internal modules

### Naming
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `LeaderboardTable`, `TopMoversWidget` |
| Functions/utilities | camelCase with verb prefixes | `getLeaderboard`, `backgroundIngest` |
| Server actions | camelCase verbs | `getPlayerHistory`, `getTwitchStatusForPlayer` |
| Constants | UPPER_SNAKE_CASE | `REVALIDATE_SECONDS`, `CACHE_LEADERBOARD_SECONDS` |
| CSS variables | kebab-case with namespace | `--bg-base`, `--text-primary` |

## 🐛 Troubleshooting

### Blizzard API failures
- Check retry logs: `[Blizzard] Retry X/3 after Xms`
- CN region data comes from database (synced via cron), not live API
- Verify `BLIZZARD_CLIENT_ID` and `BLIZZARD_CLIENT_SECRET` are set

### Supabase connection errors
- Validate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check RLS policies for anon key queries
- Service role queries bypass RLS (use `supabaseAdmin`)

### Cache staleness
- Manual cache invalidation: `revalidateTag('leaderboard')` or `revalidatePath('/path')`
- Cache warming workflow via `.github/workflows/warm-cache.yml`

### Build failures
- Run `npm run lint` to catch TypeScript errors
- Check for unused imports or variables
- Verify all environment variables are set (use `.env.example` as template)

## 📚 Additional Documentation

- **[QWEN.md](./QWEN.md)** — Comprehensive project documentation and conventions
- **[AGENTS.md](./AGENTS.md)** — Developer guidelines and code style reference

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Guidelines:**
- Keep commits focused on single logical changes
- Run `npm run lint` and `npm run build` before submitting
- Add tests for new features when applicable
- Follow the existing code style (see `AGENTS.md`)

## 📄 License

This project is licensed under the MIT License.

---

*Not affiliated with Blizzard Entertainment or Hearthstone. All game content and materials are trademarks and property of their respective owners.*
