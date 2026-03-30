"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Minus, Tv } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

interface Player {
  rank: number;
  accountid: string;
  rating: number;
  lastRating?: number;
}

const RANK_COLORS: Record<number, string> = { 1: '#f59e0b', 2: '#94a3b8', 3: '#b45309' };

export default function LeaderboardTable({ players, twitchStatuses = {}, locale }: { players: Player[]; twitchStatuses?: Record<string, any>; locale: Locale }) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const t = translations[locale];

  // Refresh ogni 2 minuti — nessun cost extra, solo router.refresh() che ISR
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 120_000);
    return () => clearInterval(id);
  }, [router]);

  if (!players || players.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {t.noPlayers}
      </div>
    );
  }

  const filtered = players.filter(p =>
    p.accountid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 18px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-mid)',
            borderRadius: 12,
            color: 'var(--text-primary)',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 150ms',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-mid)')}
        />
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {filtered.length} {t.players}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.live}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{
        borderRadius: 16,
        border: '1px solid var(--border-dim)',
        overflow: 'hidden',
        background: 'var(--bg-surface)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
              {[t.rank, t.player, t.mmr, 'Δ'].map((h, i) => (
                <th key={h} style={{
                  padding: '12px 20px',
                  textAlign: i === 3 ? 'center' : 'left',
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  background: 'var(--bg-elevated)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((player, idx) => {
              const diff = player.lastRating ? player.rating - player.lastRating : 0;
              const twitchData = twitchStatuses[player.accountid.toLowerCase()];
              const isLive = twitchData?.isLive;
              const rankColor = RANK_COLORS[player.rank];
              const isTop3 = player.rank <= 3;

              return (
                <tr
                  key={player.rank}
                  style={{
                    borderTop: idx === 0 ? 'none' : '1px solid var(--border-dim)',
                    background: isTop3 ? 'rgba(59,130,246,0.02)' : 'transparent',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = isTop3 ? 'rgba(59,130,246,0.02)' : 'transparent')}
                >
                  {/* Rank */}
                  <td style={{ padding: '14px 20px', width: 72 }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      color: rankColor || 'var(--text-muted)',
                    }}>
                      #{player.rank}
                    </span>
                  </td>

                  {/* Player */}
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Link
                        href={`/player/${player.accountid}`}
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          transition: 'color 150ms',
                        }}
                        onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--accent)')}
                        onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-primary)')}
                      >
                        {player.accountid}
                      </Link>
                      {isLive && (
                        <a
                          href={`https://twitch.tv/${twitchData.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 7px',
                            borderRadius: 6,
                            background: 'rgba(168,85,247,0.12)',
                            border: '1px solid rgba(168,85,247,0.25)',
                            fontSize: 10,
                            fontWeight: 800,
                            color: '#a855f7',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            flexShrink: 0,
                          }}
                        >
                          <Tv size={9} />
                          Live
                        </a>
                      )}
                    </div>
                  </td>

                  {/* MMR */}
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--accent)',
                    }}>
                      {player.rating.toLocaleString()}
                    </span>
                  </td>

                  {/* Delta */}
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    {diff > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
                        <TrendingUp size={13} /> +{diff}
                      </span>
                    ) : diff < 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>
                        <TrendingDown size={13} /> {diff}
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                        <Minus size={13} color="var(--text-muted)" />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}