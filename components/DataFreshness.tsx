"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Clock } from 'lucide-react';

const AUTO_REFRESH_INTERVAL = 60; // seconds

export default function DataFreshness({ lastUpdated }: { lastUpdated: number }) {
  const router = useRouter();
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [nextRefresh, setNextRefresh] = useState(AUTO_REFRESH_INTERVAL);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const tick = () => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
      setNextRefresh(prev => {
        if (prev <= 1) return AUTO_REFRESH_INTERVAL;
        return prev - 1;
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    router.refresh();
    // Keep spinner visible briefly for feedback
    await new Promise(r => setTimeout(r, 500));
    setIsRefreshing(false);
    setNextRefresh(AUTO_REFRESH_INTERVAL);
  }, [router]);

  const formatTime = (s: number) => {
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  };

  const progress = (nextRefresh / AUTO_REFRESH_INTERVAL) * 100;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 11,
      color: 'var(--text-muted)',
      fontWeight: 500,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        <Clock size={12} />
        <span>{secondsAgo < 5 ? 'Just now' : formatTime(secondsAgo)}</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Auto-refresh progress: ${Math.round(progress)}%`}
        style={{
          width: 60,
          height: 3,
          borderRadius: 2,
          background: 'var(--bg-subtle)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          width: `${progress}%`,
          height: '100%',
          borderRadius: 2,
          background: 'var(--accent)',
          transition: 'width 1s linear',
        }} />
      </div>

      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          borderRadius: 4,
          border: '1px solid var(--border-dim)',
          background: isRefreshing ? 'var(--accent-dim)' : 'transparent',
          color: isRefreshing ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: 10,
          fontWeight: 600,
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          transition: 'all 150ms',
        }}
        onMouseEnter={e => {
          if (!isRefreshing) {
            e.currentTarget.style.borderColor = 'var(--border-mid)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={e => {
          if (!isRefreshing) {
            e.currentTarget.style.borderColor = 'var(--border-dim)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
        Refresh
      </button>
    </div>
  );
}
