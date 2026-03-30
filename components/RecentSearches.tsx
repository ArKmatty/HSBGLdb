"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, X } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export default function RecentSearches({ locale }: { locale: Locale }) {
  const [recent, setRecent] = useState<string[]>([]);
  const t = translations[locale];

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  const remove = (name: string) => {
    const updated = recent.filter(n => n !== name);
    setRecent(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

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
