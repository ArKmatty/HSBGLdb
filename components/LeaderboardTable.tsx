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

const RANK_COLORS: Record<number, string> = { 1: '#e8a838', 2: '#8b8fa3', 3: '#a0722a' };

export default function LeaderboardTable({ players, twitchStatuses = {}, locale }: { players: Player[]; twitchStatuses?: Record<string, { isLive: boolean; twitchUsername?: string; title?: string; viewerCount?: number }>; locale: Locale }) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const t = translations[locale];

  useEffect(() => {
    const handler = () => {
      if (!document.hidden) router.refresh();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
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
          aria-label={t.searchPlaceholder}
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
        borderRadius: 10,
        border: '1px solid var(--border-dim)',
        overflow: 'hidden',
        background: 'var(--bg-surface)',
      }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }} aria-label="Leaderboard rankings">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                {[t.rank, t.player, t.mmr, 'Δ'].map((h, i) => (
                  <th key={h} className={i === 3 ? 'hide-mobile' : ''} style={{
                    padding: '10px 16px',
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
                      background: isTop3 ? 'rgba(232,168,56,0.02)' : 'transparent',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isTop3 ? 'rgba(232,168,56,0.02)' : 'transparent')}
                  >
                    {/* Rank */}
                    <td style={{ padding: '12px 16px', width: 60 }}>
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
                    <td style={{ padding: '12px 16px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <Link
                          href={`/player/${player.accountid}`}
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            transition: 'color 150ms',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: 0,
                          }}
                          onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--accent)')}
                          onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-primary)')}
                        >
                          {player.accountid}
                        </Link>
                        {isLive && (
                          <a
                            href={`https://twitch.tv/${twitchData.twitchUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '6px 10px',
                              borderRadius: 6,
                              background: 'rgba(167,139,250,0.1)',
                              border: '1px solid rgba(167,139,250,0.2)',
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--purple)',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              flexShrink: 0,
                            }}
                          >
                            <Tv size={10} />
                            Live
                          </a>
                        )}
                      </div>
                    </td>

                    {/* MMR */}
                    <td style={{ padding: '12px 16px' }}>
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
                    <td className="hide-mobile" style={{ padding: '12px 16px', textAlign: 'center' }}>
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
    </div>
  );
}
