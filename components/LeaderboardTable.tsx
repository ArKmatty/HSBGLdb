"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown, Crown } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { translations } from "@/lib/i18n";
import { EmptyState } from "./EmptyState";
import { getTwitchStatusesForLeaderboard } from "@/app/actions/twitch";

interface Player {
  rank: number;
  accountid: string;
  rating: number;
  lastRating?: number;
}

type SortKey = 'rank' | 'name' | 'mmr' | 'delta';

const RANK_COLORS: Record<number, string> = { 1: '#e8a838', 2: '#8b8fa3', 3: '#a0722a' };

export default function LeaderboardTable({ players, twitchStatuses: initialTwitchStatuses = {}, locale, region }: { players: Player[]; twitchStatuses?: Record<string, { isLive: boolean; twitchUsername?: string; title?: string; viewerCount?: number }>; locale: Locale; region?: string }) {
  const [twitchStatuses, setTwitchStatuses] = useState(initialTwitchStatuses);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const router = useRouter();
  const t = translations[locale];

  useEffect(() => {
    const REFRESH_COOLDOWN_MS = 60_000; // 1 minute cooldown between refreshes
    let lastRefreshTime = 0;

    const handler = () => {
      if (!document.hidden) {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTime;

        // Only refresh if cooldown period has passed
        if (timeSinceLastRefresh >= REFRESH_COOLDOWN_MS) {
          router.refresh();
          lastRefreshTime = now;
        }
      }
    };

    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [router]);

  // Fetch Twitch statuses client-side after initial render (non-blocking for FCP)
  useEffect(() => {
    let cancelled = false;
    const fetchTwitch = async () => {
      const playerIds = players.map(p => p.accountid);
      if (playerIds.length === 0) return;
      const statuses = await getTwitchStatusesForLeaderboard(playerIds);
      if (!cancelled) setTwitchStatuses(statuses);
    };
    fetchTwitch();
    return () => { cancelled = true; };
  }, [players]);

  const getDelta = useCallback((p: Player) => p.lastRating ? p.rating - p.lastRating : 0, []);

  const filtered = useMemo(() => 
    players.filter(p =>
      p.accountid.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [players, searchTerm]
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'rank') cmp = a.rank - b.rank;
      else if (sortKey === 'name') cmp = a.accountid.localeCompare(b.accountid);
      else if (sortKey === 'mmr') cmp = a.rating - b.rating;
      else if (sortKey === 'delta') cmp = getDelta(a) - getDelta(b);
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [filtered, sortKey, sortDir, getDelta]);

  if (!players || players.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title={t.noPlayers}
        description="No players found in this region yet."
      />
    );
  }

  if (filtered.length === 0 && searchTerm) {
    return (
      <EmptyState
        type="no-data"
        title="No players found"
        description={`No players match "${searchTerm}". Try a different search term.`}
      />
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' ? 'asc' : 'asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc' ? <ChevronUp size={10} style={{ marginLeft: 2, display: 'inline', verticalAlign: 'middle' }} /> : <ChevronDown size={10} style={{ marginLeft: 2, display: 'inline', verticalAlign: 'middle' }} />;
  };

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
            transition: 'border-color 150ms, box-shadow 150ms',
          }}
          onFocus={e => {
            e.target.style.borderColor = 'var(--accent)';
            e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
          }}
          onBlur={e => {
            e.target.style.borderColor = 'var(--border-mid)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {sorted.length} {t.players}
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
                {([
                  { key: 'rank' as SortKey, label: t.rank, align: 'left' as const },
                  { key: 'name' as SortKey, label: t.player, align: 'left' as const },
                  { key: 'mmr' as SortKey, label: t.mmr, align: 'left' as const },
                  { key: 'delta' as SortKey, label: 'Δ', align: 'center' as const },
                ]).map(({ key, label, align }, i) => (
                  <th
                    key={key}
                    className={i === 3 ? 'hide-mobile' : ''}
                    onClick={() => handleSort(key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSort(key);
                      }
                    }}
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    aria-label={`Sort by ${label}`}
                    style={{
                      padding: '10px 16px',
                      textAlign: align,
                      fontSize: 10,
                      fontWeight: 800,
                      color: sortKey === key ? 'var(--text-primary)' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      background: 'var(--bg-elevated)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 150ms',
                    }}
                  >
                    {label}<SortIcon column={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, idx) => {
                const diff = player.lastRating ? player.rating - player.lastRating : 0;
                const twitchData = twitchStatuses[player.accountid.toLowerCase()];
                const isLive = twitchData?.isLive;
                const rankColor = RANK_COLORS[player.rank];
                const isTop3 = player.rank <= 3;

                return (
                  <tr
                    key={`${player.accountid}-${player.rank}`}
                    className="leaderboard-row"
                    style={{
                      borderTop: idx === 0 ? 'none' : '1px solid var(--border-dim)',
                      background: isTop3 ? 'rgba(232,168,56,0.05)' : 'transparent',
                    }}
                  >
                    {/* Rank */}
                    <td style={{ padding: '12px 16px', width: 60 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {player.rank <= 3 && (
                          <Crown 
                            size={14} 
                            style={{ 
                              color: rankColor,
                              flexShrink: 0,
                            }} 
                          />
                        )}
                        <span style={{
                          fontSize: 13,
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                          color: rankColor || 'var(--text-muted)',
                        }}>
                          #{player.rank}
                        </span>
                      </div>
                    </td>

                    {/* Player */}
                    <td style={{ padding: '12px 16px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <Link
                          href={`/player/${player.accountid}?region=${region || 'EU'}`}
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
                              background: 'rgba(145,70,255,0.15)',
                              border: '1px solid rgba(145,70,255,0.3)',
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#9146FF',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              flexShrink: 0,
                              boxShadow: '0 0 12px rgba(145,70,255,0.2)',
                            }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M4.265 1 2 5.385v13.229h4.504V23l4.313-4.386h3.616L21.736 11.3V1H4.265zm2.382 2.308h12.698v7.269l-4.504 4.634h-4.313L7.27 19.304v-4.093H6.647V3.308zm3.656 3.23v4.053h2.156V6.538H10.303zm5.66 0v4.053h2.157V6.538h-2.157z"/>
                            </svg>
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
