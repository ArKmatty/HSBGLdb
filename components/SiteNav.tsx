"use client";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { Search, TrendingUp, Sun, Moon, FileText } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { searchPlayers } from '@/app/actions/player';
import { EmptyState } from './EmptyState';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useDebouncedSearch } from '@/lib/useDebouncedSearch';

const REGIONS = ['EU', 'US', 'AP', 'CN'] as const;

export default function SiteNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRegion = searchParams.get('region') || 'EU';
  const isHome = pathname === '/';

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const trapRef = useFocusTrap(searchOpen);
  const { debouncedSearch, cancelDebounce } = useDebouncedSearch(200);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setQuery('');
        setSuggestions([]);
      }
      if (e.key === '/' && !searchOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchOpen]);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) setTheme(saved);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }, [theme]);

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      return;
    }
    setSearching(true);
    try {
      const results = await searchPlayers(q);
      setSuggestions(results.slice(0, 5));
      setActiveSuggestionIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    debouncedSearch(async () => {
      await handleSearch(value);
    });
  }, [handleSearch, debouncedSearch]);

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-dim)',
          backdropFilter: 'blur(8px)',
          transition: 'background-color 300ms ease',
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 56,
          }}
        >
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <Image src="/logo.png" alt="Hearthstone Battlegrounds Leaderboard" width={28} height={28} style={{ objectFit: 'contain', background: 'var(--bg-surface)', borderRadius: 6 }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>HSBGLdb</span>
            </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Region tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-base)', borderRadius: 6, padding: 2 }}>
              {REGIONS.map(r => (
                <Link
                  key={r}
                  href={`/?region=${r}&page=1`}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    transition: 'all 150ms',
                    background: isHome && currentRegion === r ? 'var(--bg-elevated)' : 'transparent',
                    color: isHome && currentRegion === r ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: isHome && currentRegion === r ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!(isHome && currentRegion === r)) {
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!(isHome && currentRegion === r)) {
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  {r}
                </Link>
              ))}
            </div>

            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-dim)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-mid)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-dim)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              aria-label="Search players"
            >
              <Search size={14} />
              <span>Search</span>
            </button>

            {/* Patch Notes link */}
            <Link
              href="/patch-notes"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid var(--border-dim)',
                background: 'transparent',
                color: 'var(--text-muted)',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-mid)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-dim)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              aria-label="Patch Notes"
            >
              <FileText size={14} />
            </Link>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid var(--border-dim)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-mid)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-dim)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Search modal */}
      {searchOpen && (
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 100,
            paddingTop: 120,
            padding: '120px 20px 20px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              setSearchOpen(false);
              setQuery('');
              setSuggestions([]);
              cancelDebounce();
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setSearchOpen(false);
              setQuery('');
              setSuggestions([]);
              cancelDebounce();
            }
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-dim)',
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 440,
            }}
          >
            <h3 id="search-modal-title" style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Search Players
            </h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                borderRadius: 8,
                border: '1px solid var(--border-mid)',
                transition: 'border-color 200ms, box-shadow 200ms',
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
              <Search size={16} color="var(--text-muted)" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveSuggestionIndex(prev => 
                      prev < suggestions.length - 1 ? prev + 1 : prev
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const selectedIndex = activeSuggestionIndex >= 0 ? activeSuggestionIndex : 0;
                    if (suggestions.length > 0 && selectedIndex < suggestions.length) {
                      window.location.href = `/player/${encodeURIComponent(suggestions[selectedIndex])}`;
                    }
                  }
                }}
                placeholder="Enter player name..."
                role="combobox"
                aria-expanded={suggestions.length > 0}
                aria-controls="suggestions-listbox"
                aria-haspopup="listbox"
                aria-activedescendant={activeSuggestionIndex >= 0 ? `suggestion-${activeSuggestionIndex}` : undefined}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>

            {(suggestions.length > 0 || searching) && query.length >= 2 && (
              <div
                id="suggestions-listbox"
                role="listbox"
                aria-label="Search suggestions"
                style={{
                  marginTop: 8,
                  maxHeight: 240,
                  overflowY: 'auto',
                  borderRadius: 8,
                  border: '1px solid var(--border-dim)',
                }}
              >
                {searching ? (
                  <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    Searching...
                  </div>
                ) : (
                  suggestions.map((name, idx) => (
                    <Link
                      key={name}
                      id={`suggestion-${idx}`}
                      role="option"
                      aria-selected={idx === activeSuggestionIndex}
                      href={`/player/${encodeURIComponent(name)}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setQuery('');
                        setSuggestions([]);
                        cancelDebounce();
                      }}
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        background: idx === activeSuggestionIndex ? 'var(--bg-elevated)' : 'transparent',
                        borderBottom: '1px solid var(--border-dim)',
                        color: 'var(--text-secondary)',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <TrendingUp size={12} style={{ marginRight: 8, opacity: 0.5 }} />
                      {name}
                    </Link>
                  ))
                )}
              </div>
            )}

            {query.length >= 2 && !searching && suggestions.length === 0 && (
              <EmptyState
                type="no-results"
                title="No players found"
                description="Try a different search term"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
