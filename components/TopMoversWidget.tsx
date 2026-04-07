"use client";

import Link from 'next/link';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef, memo } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

interface Mover {
  accountid: string;
  diff: number;
  rating: number;
}

// Memoized mover card to prevent unnecessary re-renders
const MoverCard = memo(function MoverCard({
  player,
  idx,
  region,
  type,
  accentColor,
  borderColor,
}: {
  player: Mover;
  idx: number;
  region: string;
  type: 'mover' | 'faller';
  accentColor: string;
  borderColor: string;
}) {
  return (
    <Link
      href={`/player/${player.accountid}?region=${region}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '12px 14px',
        minWidth: 140,
        maxWidth: 140,
        background: 'var(--gradient-card)',
        border: '1px solid var(--border-dim)',
        borderLeft: `3px solid ${idx === 0 ? borderColor : 'transparent'}`,
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
          color: idx < 3 ? accentColor : 'var(--text-muted)',
        }}>
          #{idx + 1}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>
          {type === 'mover' ? '+' : ''}{player.diff}
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
        {player.accountid}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
        {player.rating.toLocaleString()} MMR
      </span>
    </Link>
  );
});

export default function TopMoversWidget({ players, fallers, locale, region }: { players: Mover[]; fallers?: Mover[]; locale: Locale; region?: string }) {
  const t = translations[locale];
  if (!players || players.length === 0) {
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

      <ScrollableMovers cards={players} region={regionParam} type="mover" locale={locale} />

      {/* Top Fallers */}
      {fallers && fallers.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 16 }}>
            <TrendingDown size={13} color="var(--red)" />
            <h2 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              {t.biggestDrops || 'Biggest Drops · 24h'}
            </h2>
          </div>

          <ScrollableMovers cards={fallers} region={regionParam} type="faller" locale={locale} />
        </>
      )}
    </section>
  );
}

// Sub-component for scrollable mover cards with fade indicator
function ScrollableMovers({ cards, region, type, locale }: { cards: { accountid: string; diff: number; rating: number }[]; region: string; type: 'mover' | 'faller'; locale: Locale }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const t = translations[locale];
  const accentColor = type === 'mover' ? 'var(--green)' : 'var(--red)';
  const borderColor = type === 'mover' ? 'var(--green)' : 'var(--red)';

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [cards]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 4,
        }}
      >
        {cards.map((p, idx) => (
          <MoverCard
            key={p.accountid}
            player={p}
            idx={idx}
            region={region}
            type={type}
            accentColor={accentColor}
            borderColor={borderColor}
          />
        ))}
      </div>

      {/* Scroll indicator fade */}
      {canScrollRight && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 4,
            width: 40,
            background: 'linear-gradient(to right, transparent, var(--bg-surface))',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 6,
          }}
          aria-hidden="true"
        >
          <ChevronRight size={14} color="var(--text-muted)" style={{ opacity: 0.6 }} />
        </div>
      )}
    </div>
  );
}
