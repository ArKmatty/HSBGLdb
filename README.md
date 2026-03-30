# Hearthstone Battlegrounds Leaderboard

Live MMR rankings for Hearthstone Battlegrounds players across EU, US, and AP regions.

## Features

- **Regional leaderboards** — browse top players by region with pagination
- **Top Movers** — see who's climbing fastest in the last 24 hours
- **Player profiles** — MMR history charts, live rank tracking, and stats (peak, 7-day trend, matches)
- **Twitch integration** — see which players are currently streaming, with viewer counts
- **i18n** — automatic English/Italian detection based on browser language
- **Recent searches** — quick access to players you've looked up before

## Tech Stack

- **Next.js 16** (App Router, Server Components)
- **Supabase** — player history storage and social mappings
- **Blizzard API** — live leaderboard data
- **Twitch API** — stream status
- **Recharts** — MMR history visualization

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
CRON_SECRET=
```

## Deploy

Deployed on [Vercel](https://vercel.com). Pushes to `main` trigger automatic deployments.
