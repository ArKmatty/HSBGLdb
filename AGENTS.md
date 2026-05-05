# AGENTS.md — Hearthstone Leaderboard

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (eslint-config-next core-web-vitals + typescript)
npm test             # Vitest watch mode
npm run test:run     # Vitest single run
npx vitest path/to/test.test.ts  # Run a single test file
```

## Testing

- **Framework**: Vitest with `jsdom` environment and `@vitejs/plugin-react`.
- **Config**: `vitest.config.ts`. Includes `**/*.test.ts` and `**/*.test.tsx`; excludes `node_modules`, `.next`, `e2e`.
- **Env vars in tests**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are auto-set to test placeholders.
- **Existing tests**: `lib/__tests__/stats.test.ts`. If adding tests, prefer co-locating `*.test.ts` near the source or under `lib/__tests__/`.

## Architecture

- **App Router** (`app/`) with Server Components by default.
- **Server Actions** (`app/actions/*.ts`) marked with `"use server"`.
- **Client Components** (`components/*.tsx`) marked with `"use client"`.
- **Data layer**: Supabase — `supabase` (anon key, client-safe, RLS-protected) + `supabaseAdmin` (service role, server-only, bypasses RLS) + Blizzard API (`lib/blizzard.ts`).
- **Caching**: `unstable_cache` from `next/cache` with explicit revalidate times; `fetch` with `{ next: { revalidate: SECONDS } }` for external APIs.
- **Path aliases**: `@/*` maps to project root (configured in `tsconfig.json`).
- **Styling**: CSS design tokens in `app/globals.css` + Tailwind CSS v4 via PostCSS.
- **i18n**: `lib/i18n.ts` for internationalization (`Locale = 'en' | 'it'`).
- **Charts**: `recharts` for data visualization; `lucide-react` for icons.
- **Analytics**: `@vercel/analytics` for usage tracking.
- **Font**: `Inter` via `next/font/google` with `display: 'swap'`.
- **SEO**: Dynamic metadata via `generateMetadata`, JSON-LD structured data in layout, security headers in `next.config.ts`.

## Critical Conventions

### Styling
- **100% inline styles** via `style={{ ... }}` — no Tailwind utility classes in components. Exception: layout-level Tailwind classes in `layout.tsx` (e.g., `className="min-h-full flex flex-col"`).
- All colors reference CSS custom properties (`--bg-base`, `--accent`, `--text-primary`, etc.) — never hardcode hex values. Exception: `global-error.tsx` hardcodes hex since it renders before CSS loads.
- Hover effects via `onMouseEnter`/`onMouseLeave` mutating `e.currentTarget.style`.
- Custom CSS classes only for animations/responsive: `.animate-fade-in`, `.hide-mobile`, `.leaderboard-row`, `.animate-spin`, `.animate-shimmer`, `.pagination-btn`.

### TypeScript & Components
- **Strict mode enabled**, target ES2017 — no `any` unless unavoidable (e.g., Twitch API responses).
- Define interfaces for data shapes locally in component files (exception: shared types in `lib/types.ts`).
- Use `Readonly<>` for component props when appropriate.
- Server Components by default; add `"use client"` only when using hooks (`useState`, `useEffect`, `useRouter`).
- Use `Promise.all` for parallel data fetching in Server Components.
- **Next.js 15+ search params** use the `Promise<{...}>` pattern — always `await` them before accessing.

### Error Handling
- Server actions return typed envelopes: `{ success: boolean; data?: T; error?: string }`.
- **Never throw errors to client** from server actions.
- Use `try/catch` around external API calls (Blizzard, Twitch, Supabase).
- Log errors with `console.error` and context prefix (e.g., `[Ingest]`, `[Perf]`, `[Supabase]`).
- Graceful degradation: return empty arrays/objects rather than crashing.
- Validate user input at action boundaries before processing.
- `error.tsx` — client component with `reset()` and error logging.
- `global-error.tsx` — wraps `<html>`/`<body>`, hardcodes hex colors (CSS not yet loaded).
- `loading.tsx` — skeleton UI with `animation: 'pulse 2s infinite'`.

### Caching Strategy
- `unstable_cache` for expensive computations with explicit `revalidate` seconds.
- Cache tags for targeted revalidation (e.g., `{ tags: ['leaderboard'] }`).
- In-memory cooldown maps for rate-limited operations (see `app/actions/socials.ts` for login throttling).
- Document cache durations in comments.

### Server Actions
- All files in `app/actions/` must begin with `"use server"` directive.
- Return typed envelopes: `{ success: boolean; data?: T; error?: string }`.
- Use `revalidatePath()` after mutations to invalidate cached pages.
- Admin actions use cookie-based auth (`admin_auth`) with HMAC-signed session tokens (never store plaintext secrets).
- Rate-limited login (5 attempts, 15min lockout) via in-memory Map.
- Sanitize user input (e.g., strip HTML from usernames) before database operations.

### API Routes
- Protect cron endpoints with `CRON_SECRET` Bearer token auth.
- Use `cache: 'no-store'` for fresh data in API handlers.
- OG images use edge runtime with `ImageResponse` from `next/og`.
- CN region uses separate API endpoint (`webapi.blizzard.cn`) — handle in cron sync.

### Environment Variables
- **Client-safe**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
- **Server-only**: `BLIZZARD_CLIENT_ID/SECRET`, `TWITCH_CLIENT_ID/SECRET`, `CRON_SECRET`, `ADMIN_SECRET`, `CN_SEASON_ID`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Validation at module load**: `lib/supabase.ts` throws immediately if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing. Other env vars are read lazily or have fallbacks.
- Never log or expose secret values. Use placeholder fallbacks in development (see `.env.example`).

### Regional Handling
- **EU, US, AP**: Standard Blizzard API (`hearthstone.blizzard.com`).
- **CN**: Separate API (`webapi.blizzard.cn`) — data stored in database via cron sync for reliability; do not fetch live from CN API in user-facing paths.
- **Multi-region**: Combined leaderboard with cross-region sorting and ranking.

### Accessibility
- Modal dialogs must trap focus — use `useFocusTrap` hook from `lib/useFocusTrap.ts`.
- All interactive elements need `aria-label` when no visible text is present.
- Modal overlays should restore focus to the trigger element on close.
- Add `role="dialog"` and `aria-modal="true"` to modal containers.

## Imports & Naming

- Use absolute paths with `@/` alias for `lib/` and `app/` imports (e.g., `import { supabase } from '@/lib/supabase'`).
- Use relative paths for sibling/nearby files (e.g., `import LeaderboardTable from '../components/LeaderboardTable'`).
- Group imports in order: Next.js/core → external libraries → internal modules.
- Default exports for components; named exports for utilities and server actions.
- **Naming**: Components PascalCase; functions camelCase with verb prefix; server actions camelCase verbs; constants UPPER_SNAKE_CASE; CSS variables kebab-case with namespace; interfaces/types PascalCase.

## Git

- Do not commit `.env.local` or any secrets.
- Commit messages: imperative mood, concise (e.g., "Add pagination to leaderboard").
- Keep commits focused on single logical changes.
