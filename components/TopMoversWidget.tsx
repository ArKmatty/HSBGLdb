"use client";

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

interface Mover {
  accountid: string;
  diff: number;
  rating: number;
}

export default function TopMoversWidget({ players, locale }: { players: Mover[]; locale: Locale }) {
  const t = translations[locale];
  if (!players || players.length === 0) return null;

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <TrendingUp size={13} color="var(--text-muted)" />
        <h2 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          {t.topMovers}
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {players.map((p, idx) => (
          <Link
            key={p.accountid}
            href={`/player/${p.accountid}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: '12px 14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-dim)',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-mid)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dim)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: idx < 3 ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                #{idx + 1}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
                +{p.diff}
              </span>
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {p.accountid}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              {p.rating.toLocaleString()} {t.mmr}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
