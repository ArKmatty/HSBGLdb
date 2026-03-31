"use client";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Search, TrendingUp, Sun, Moon } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { searchPlayers } from '@/app/actions/player';

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

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
      return;
    }
    setSearching(true);
    try {
      const results = await searchPlayers(q);
      setSuggestions(results.slice(0, 5));
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 200);
  }, [handleSearch]);

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
            height: 48,
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
              <img src="/logo.png" alt="Hearthstone Battlegrounds Leaderboard" width={24} height={24} style={{ objectFit: 'contain', background: 'white', borderRadius: 4 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>HSBGLdb</span>
            </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Region tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-base)', borderRadius: 6, padding: 2 }}>
              {REGIONS.map(r => (
                <Link
                  key={r}
                  href={`/?region=${r}`}
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
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setSearchOpen(false);
              setQuery('');
              setSuggestions([]);
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
                  if (e.key === 'Enter' && suggestions.length > 0) {
                    window.location.href = `/player/${encodeURIComponent(suggestions[0])}`;
                  }
                }}
                placeholder="Enter player name..."
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
                  suggestions.map(name => (
                    <Link
                      key={name}
                      href={`/player/${encodeURIComponent(name)}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setQuery('');
                        setSuggestions([]);
                      }}
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        background: 'transparent',
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
              <div style={{ marginTop: 8, padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                No players found
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
