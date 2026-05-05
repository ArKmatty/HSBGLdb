"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompare, X, Search, Loader2 } from 'lucide-react';
import { searchPlayers } from '@/app/actions/player';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useDebouncedSearch } from '@/lib/useDebouncedSearch';

export default function PlayerCompare({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [compareName, setCompareName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ accountId: string; rating: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const trapRef = useFocusTrap(open);
  const { debouncedSearch, cancelDebounce } = useDebouncedSearch(200);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      return;
    }
    setSearching(true);
    try {
      const response = await searchPlayers(query);
      if (response.success) {
        setSuggestions(response.players.filter(p => p.accountId.toLowerCase() !== currentName.toLowerCase()));
      } else {
        setSuggestions([]);
      }
      setActiveSuggestionIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, [currentName]);

  const handleChange = useCallback((value: string) => {
    setCompareName(value);
    setError(null);
    debouncedSearch(async () => {
      await handleSearch(value);
    });
  }, [handleSearch, debouncedSearch]);

  const handleCompare = useCallback(async (name?: string) => {
    const target = name || compareName.trim();
    if (!target || target.toLowerCase() === currentName.toLowerCase()) return;
    setLoading(true);
    router.push(`/compare/${encodeURIComponent(currentName)}/${encodeURIComponent(target)}`);
  }, [currentName, compareName, router]);

  const handleSelectSuggestion = useCallback((player: { accountId: string; rating: number }) => {
    setCompareName(player.accountId);
    setSuggestions([]);
    handleCompare(player.accountId);
  }, [handleCompare]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setCompareName('');
    setSuggestions([]);
    setError(null);
    cancelDebounce();
  }, [cancelDebounce]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
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
      >
        <GitCompare size={14} />
        Compare
      </button>
    );
  }

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      onKeyDown={e => { if (e.key === 'Escape') handleClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 id="compare-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Compare players
          </h3>
          <button
            onClick={handleClose}
            aria-label="Close comparison"
            style={{
              padding: 6,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          padding: '10px 12px',
          background: 'var(--bg-elevated)',
          borderRadius: 8,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
            {currentName}
          </span>
          <GitCompare size={14} color="var(--text-muted)" />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              ref={inputRef}
              type="text"
              value={compareName}
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
                  if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
                    handleSelectSuggestion(suggestions[activeSuggestionIndex]);
                  } else {
                    handleCompare();
                  }
                }
              }}
              placeholder="Enter player name..."
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="compare-suggestions-listbox"
              aria-haspopup="listbox"
              aria-activedescendant={activeSuggestionIndex >= 0 ? `compare-suggestion-${activeSuggestionIndex}` : undefined}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'inherit',
                outline: 'none',
                minWidth: 0,
              }}
            />
          </div>
        </div>

        {/* Suggestions dropdown */}
        {(suggestions.length > 0 || searching) && compareName.length >= 2 && (
          <div
            id="compare-suggestions-listbox"
            role="listbox"
            aria-label="Player suggestions"
            style={{
              marginBottom: 16,
              maxHeight: 200,
              overflowY: 'auto',
              borderRadius: 8,
              border: '1px solid var(--border-dim)',
            }}
          >
            {searching ? (
              <div style={{
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: 'var(--text-muted)',
              }}>
                <Loader2 size={14} className="animate-spin" />
                Searching...
              </div>
            ) : (
              suggestions.map((player, idx) => (
                <button
                  key={player.accountId}
                  id={`compare-suggestion-${idx}`}
                  role="option"
                  aria-selected={idx === activeSuggestionIndex}
                  onClick={() => handleSelectSuggestion(player)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: idx === activeSuggestionIndex ? 'var(--bg-elevated)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border-dim)',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Search size={12} color="var(--text-muted)" />
                  {player.accountId}
                </button>
              ))
            )}
          </div>
        )}

        {error && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.15)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--red)',
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={() => handleCompare()}
          disabled={loading || !compareName.trim()}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--bg-base)',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading || !compareName.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: loading || !compareName.trim() ? 0.7 : 1,
          }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Compare MMR
        </button>
      </div>
    </div>
  );
}
