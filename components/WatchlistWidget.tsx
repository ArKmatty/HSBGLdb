"use client";

import Link from "next/link";
import { Heart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";
import { translations, type Locale } from "@/lib/i18n";

interface WatchedPlayer {
  name: string;
  rating?: number;
  delta?: number;
  region?: string;
}

export default function WatchlistWidget({
  players,
  locale,
  region,
}: {
  players?: WatchedPlayer[];
  locale: Locale;
  region?: string;
}) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const t = translations[locale];

  if (watchlist.length === 0) {
    return null;
  }

  const regionParam = region || "EU";

  return (
    <section
      style={{
        marginBottom: 28,
        padding: 16,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-dim)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Heart size={18} fill="var(--accent)" color="var(--accent)" />
        <h2
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {t.watchlist || "Watchlist"} ({watchlist.length})
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {watchlist.map((name) => {
          const playerData = players?.find((p) => p.name === name);
          const delta = playerData?.delta ?? 0;

          return (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "var(--bg-base)",
                borderRadius: 8,
                border: "1px solid var(--border-dim)",
              }}
            >
              <Link
                href={`/player/${name}?region=${regionParam}`}
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  textDecoration: "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </Link>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {playerData?.rating && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: delta > 0 ? "var(--green)" : delta < 0 ? "var(--red)" : "var(--text-muted)",
                    }}
                  >
                    {delta > 0 ? (
                      <TrendingUp size={12} />
                    ) : delta < 0 ? (
                      <TrendingDown size={12} />
                    ) : (
                      <Minus size={12} />
                    )}
                    {delta > 0 ? "+" : ""}
                    {delta !== 0 ? delta : playerData.rating}
                  </div>
                )}

                <button
                  onClick={() => removeFromWatchlist(name)}
                  aria-label={`Remove ${name} from watchlist`}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "var(--text-muted)",
                    transition: "color 150ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  <Heart size={14} fill="var(--accent)" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
