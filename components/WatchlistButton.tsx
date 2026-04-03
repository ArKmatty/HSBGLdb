"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";

export default function WatchlistButton({ playerName }: { playerName: string }) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const [isAnimating, setIsAnimating] = useState(false);

  const isWatched = isInWatchlist(playerName);

  const handleClick = () => {
    setIsAnimating(true);
    toggleWatchlist(playerName);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={isWatched}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 4,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: isWatched ? "var(--accent)" : "var(--text-muted)",
        transition: "transform 150ms, color 150ms",
        transform: isAnimating ? "scale(1.2)" : "scale(1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = isWatched ? "var(--accent)" : "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = isWatched ? "var(--accent)" : "var(--text-muted)";
      }}
    >
      <Heart size={18} fill={isWatched ? "var(--accent)" : "none"} aria-hidden="true" />
    </button>
  );
}
