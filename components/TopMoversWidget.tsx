"use client";

import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

interface Mover {
  accountid: string;
  diff: number;
  rating: number;
}

export default function TopMoversWidget({ players, fallers, locale, region }: { players: Mover[]; fallers?: Mover[]; locale: Locale; region?: string }) {
  const t = translations[locale];
  if (!players || players.length === 0) {
    // Show empty state with subtle message instead of hiding completely
    return (
      <section style={{ marginBottom: 28, opacity: 0.5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <TrendingUp size={13} color="var(--text-muted)" />
          <h2 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            {t.topMovers}
          </h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Not enough data in the last 24h to show movers.
        </p>
      </section>
    );
  }

  const regionParam = region || 'EU';

  return (
    <section style={{ marginBottom: 28 }}>
      {/* Top Movers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <TrendingUp size={13} color="var(--green)" />
        <h2 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          {t.topMovers}
        </h2>
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        paddingBottom: 4,
      }}>
        {players.map((p, idx) => (
          <Link
            key={p.accountid}
            href={`/player/${p.accountid}?region=${regionParam}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: '12px 14px',
              minWidth: 140,
              maxWidth: 140,
              background: 'var(--gradient-card)',
              border: '1px solid var(--border-dim)',
              borderLeft: `3px solid ${idx === 0 ? 'var(--green)' : 'transparent'}`,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderTopColor = 'var(--border-mid)';
              e.currentTarget.style.borderRightColor = 'var(--border-mid)';
              e.currentTarget.style.borderBottomColor = 'var(--border-mid)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderTopColor = 'var(--border-dim)';
              e.currentTarget.style.borderRightColor = 'var(--border-dim)';
              e.currentTarget.style.borderBottomColor = 'var(--border-dim)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
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

      {/* Top Fallers */}
      {fallers && fallers.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 16 }}>
            <TrendingDown size={13} color="var(--red)" />
            <h2 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              Biggest Drops · 24h
            </h2>
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: 4,
          }}>
            {fallers.map((p, idx) => (
              <Link
                key={p.accountid}
                href={`/player/${p.accountid}?region=${regionParam}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  padding: '12px 14px',
                  minWidth: 140,
                  maxWidth: 140,
                  background: 'var(--gradient-card)',
                  border: '1px solid var(--border-dim)',
                  borderLeft: `3px solid ${idx === 0 ? 'var(--red)' : 'transparent'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
                  boxShadow: 'var(--shadow-sm)',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderTopColor = 'var(--border-mid)';
                  e.currentTarget.style.borderRightColor = 'var(--border-mid)';
                  e.currentTarget.style.borderBottomColor = 'var(--border-mid)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderTopColor = 'var(--border-dim)';
                  e.currentTarget.style.borderRightColor = 'var(--border-dim)';
                  e.currentTarget.style.borderBottomColor = 'var(--border-dim)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: idx < 3 ? 'var(--red)' : 'var(--text-muted)',
                  }}>
                    #{idx + 1}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>
                    {p.diff}
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
        </>
      )}
    </section>
  );
}
