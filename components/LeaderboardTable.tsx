"use client";

import {
  useState, useEffect, useMemo, useCallback, useRef, memo,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown, Crown, X, Search,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { translations } from "@/lib/i18n";
import { EmptyState } from "./EmptyState";
import { getTwitchStatusesForLeaderboard } from "@/app/actions/twitch";
import { searchPlayers } from "@/app/actions/player";

interface Player {
  rank: number;
  accountid: string;
  rating: number;
  lastRating?: number;
}

type SortKey = 'rank' | 'name' | 'mmr' | 'delta';

const RANK_COLORS: Record<number, string> = { 1: '#e8a838', 2: '#8b8fa3', 3: '#a0722a' };

const SortIcon = memo(function SortIcon({
  column, sortKey, sortDir,
}: {
  column: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
}) {
  if (sortKey !== column) return null;
  return sortDir === 'asc'
    ? <ChevronUp size={10} style={{ marginLeft: 2, display: 'inline', verticalAlign: 'middle' }} />
    : <ChevronDown size={10} style={{ marginLeft: 2, display: 'inline', verticalAlign: 'middle' }} />;
});

// Memoized row component to prevent unnecessary re-renders when Twitch statuses update
const LeaderboardRow = memo(function LeaderboardRow({
  player,
  idx,
  twitchData,
  region,
  locale,
}: {
  player: Player;
  idx: number;
  twitchData?: { isLive: boolean; twitchUsername?: string; title?: string; viewerCount?: number };
  region?: string;
  locale: Locale;
}) {
  const diff = player.lastRating ? player.rating - player.lastRating : 0;
  const isLive = twitchData?.isLive;
  const rankColor = RANK_COLORS[player.rank];
  const isTop3 = player.rank <= 3;

  return (
    <tr
      className="leaderboard-row"
      style={{
        borderTop: idx === 0 ? 'none' : '1px solid var(--border-dim)',
        background: isTop3 ? 'rgba(232,168,56,0.05)' : 'transparent',
        transition: 'background-color 150ms ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = isTop3
          ? 'rgba(232,168,56,0.12)'
          : 'var(--bg-elevated)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = isTop3
          ? 'rgba(232,168,56,0.05)'
          : 'transparent';
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
              href={`https://twitch.tv/${twitchData!.twitchUsername}`}
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
                  {player.rating.toLocaleString(locale)}
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
});

export default function LeaderboardTable({ players, twitchStatuses: initialTwitchStatuses = {}, locale, region }: { players: Player[]; twitchStatuses?: Record<string, { isLive: boolean; twitchUsername?: string; title?: string; viewerCount?: number }>; locale: Locale; region?: string }) {
  const [twitchStatuses, setTwitchStatuses] = useState(initialTwitchStatuses);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ accountId: string; rating: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = translations[locale];

  // Debounced server-side search
  useEffect(() => {
    if (searchTerm.length < 3) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const response = await searchPlayers(searchTerm);
      if (response.success) {
        setSearchSuggestions(response.players);
      } else {
        setSearchSuggestions([]);
      }
      setShowSuggestions(true);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' ? 'asc' : 'asc');
    }
  }, [sortKey]);

  const handleSelectPlayer = useCallback((player: { accountId: string; rating: number }) => {
    setSearchTerm('');
    setShowSuggestions(false);
    router.push(`/player/${encodeURIComponent(player.accountId)}?region=${region || 'EU'}`);
  }, [region, router]);

  // Only use search for autocomplete navigation, not page filtering
  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'rank') cmp = a.rank - b.rank;
      else if (sortKey === 'name') cmp = a.accountid.localeCompare(b.accountid);
      else if (sortKey === 'mmr') cmp = a.rating - b.rating;
      else if (sortKey === 'delta') cmp = getDelta(a) - getDelta(b);
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [players, sortKey, sortDir, getDelta]);

  if (!players || players.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title={t.noPlayers}
        description="No players found in this region yet."
      />
    );
  }

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div
          ref={searchContainerRef}
          style={{
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-mid)',
              borderRadius: 12,
              transition: 'border-color 150ms, box-shadow 150ms',
            }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border-mid)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={`Search all players or filter on this page...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => {
              // Navigate suggestions with arrows
              if (e.key === 'ArrowDown' && showSuggestions && searchSuggestions.length > 0) {
                e.preventDefault();
                const firstItem = document.querySelector('[data-search-suggestion]') as HTMLElement;
                firstItem?.focus();
              }
              // Enter to select first suggestion
              if (e.key === 'Enter' && showSuggestions && searchSuggestions.length > 0) {
                e.preventDefault();
                handleSelectPlayer(searchSuggestions[0]);
              }
              // Escape to close suggestions
              if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            aria-label="Search players"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          {isSearching && (
            <div style={{
              width: 14,
              height: 14,
              border: '2px solid var(--border-dim)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }} />
          )}
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowSuggestions(false);
                searchInputRef.current?.focus();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                borderRadius: 4,
                transition: 'color 150ms, background-color 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div
            role="listbox"
            aria-label="Search suggestions"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-dim)',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              zIndex: 50,
            }}
          >
            {searchSuggestions.map((player, idx) => (
              <button
                key={player.accountId}
                data-search-suggestion
                onClick={() => handleSelectPlayer(player)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: idx === 0 ? 'var(--bg-elevated)' : 'transparent',
                  border: 'none',
                  borderBottom: idx < searchSuggestions.length - 1 ? '1px solid var(--border-dim)' : 'none',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 150ms',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = idx === 0 ? 'var(--bg-elevated)' : 'transparent';
                }}
                onFocus={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                }}
                onBlur={e => {
                  (e.currentTarget as HTMLElement).style.background = idx === 0 ? 'var(--bg-elevated)' : 'transparent';
                }}
              >
                <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {player.accountId}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {player.rating.toLocaleString(locale)}
                </span>
              </button>
            ))}
          </div>
        )}
        </div>
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
                    {label}<SortIcon column={key} sortKey={sortKey} sortDir={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, idx) => {
                const twitchData = twitchStatuses[player.accountid.toLowerCase()];
                return (
                  <LeaderboardRow
                    key={`${player.accountid}-${player.rank}`}
                    player={player}
                    idx={idx}
                    twitchData={twitchData}
                    region={region}
                    locale={locale}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}