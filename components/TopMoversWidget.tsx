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

const MEDALS = ['🥇', '🥈', '🥉'];

export default function TopMoversWidget({ players, locale }: { players: Mover[]; locale: Locale }) {
  const t = translations[locale];
  if (!players || players.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--accent-dim)',
          border: '1px solid rgba(59,130,246,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TrendingUp size={14} color="var(--accent)" />
        </div>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {t.topMovers}
        </h2>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {players.map((p, idx) => (
          <Link
            key={p.accountid}
            href={`/player/${p.accountid}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-dim)',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'border-color 150ms, background 150ms',
              textAlign: 'center',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)';
            }}
          >
            <span style={{ fontSize: 16, marginBottom: 6 }}>{MEDALS[idx] ?? `#${idx + 1}`}</span>
            <span style={{
              fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
            }}>
              {p.accountid}
            </span>
            <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--green)', marginTop: 8 }}>
              +{p.diff}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {p.rating.toLocaleString()} {t.mmr}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
