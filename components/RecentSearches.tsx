"use client";
import { useSyncExternalStore, useCallback } from 'react';
import Link from 'next/link';
import { Clock, X } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

const EMPTY_ARRAY: string[] = [];

let cachedRecent: string[] = EMPTY_ARRAY;

function getSnapshot(): string[] {
  try {
    const saved = localStorage.getItem('recentSearches');
    if (!saved) {
      cachedRecent = EMPTY_ARRAY;
      return EMPTY_ARRAY;
    }
    const parsed = JSON.parse(saved) as string[];
    if (cachedRecent === EMPTY_ARRAY || JSON.stringify(cachedRecent) !== JSON.stringify(parsed)) {
      cachedRecent = parsed;
    }
    return cachedRecent;
  } catch {
    cachedRecent = EMPTY_ARRAY;
    return EMPTY_ARRAY;
  }
}

function subscribe(onStoreChange: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === 'recentSearches') {
      onStoreChange();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export default function RecentSearches({ locale }: { locale: Locale }) {
  const recent = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_ARRAY);
  const t = translations[locale];

  const remove = useCallback((name: string) => {
    const updated = recent.filter(n => n !== name);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    cachedRecent = updated;
    window.dispatchEvent(new StorageEvent('storage', { key: 'recentSearches' }));
  }, [recent]);

  if (recent.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Clock size={12} color="var(--text-muted)" />
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          {t.recent}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {recent.map(name => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link
              href={`/player/${name}`}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-mid)',
                transition: 'color 150ms, border-color 150ms',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,168,56,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-mid)';
              }}
            >
              {name}
            </Link>
            <button
              onClick={() => remove(name)}
              title={t.remove}
              style={{
                padding: '8px',
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 32,
                minHeight: 32,
                transition: 'color 150ms',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--red)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
