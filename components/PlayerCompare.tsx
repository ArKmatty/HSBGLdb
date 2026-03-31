"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompare, X, Search, Loader2 } from 'lucide-react';
import { searchPlayers } from '@/app/actions/player';

export default function PlayerCompare({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [compareName, setCompareName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchPlayers(query);
      setSuggestions(results.filter(n => n.toLowerCase() !== currentName.toLowerCase()));
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, [currentName]);

  const handleChange = useCallback((value: string) => {
    setCompareName(value);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 200);
  }, [handleSearch]);

  const handleCompare = useCallback(async (name?: string) => {
    const target = name || compareName.trim();
    if (!target || target.toLowerCase() === currentName.toLowerCase()) return;
    setLoading(true);
    router.push(`/compare/${encodeURIComponent(currentName)}/${encodeURIComponent(target)}`);
  }, [currentName, compareName, router]);

  const handleSelectSuggestion = useCallback((name: string) => {
    setCompareName(name);
    setSuggestions([]);
    handleCompare(name);
  }, [handleCompare]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setCompareName('');
    setSuggestions([]);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

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
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Compare players
          </h3>
          <button
            onClick={handleClose}
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
              onKeyDown={e => { if (e.key === 'Enter') handleCompare(); }}
              placeholder="Enter player name..."
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
          <div style={{
            marginBottom: 16,
            maxHeight: 200,
            overflowY: 'auto',
            borderRadius: 8,
            border: '1px solid var(--border-dim)',
          }}>
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
              suggestions.map(name => (
                <button
                  key={name}
                  onClick={() => handleSelectSuggestion(name)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
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
                  {name}
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
