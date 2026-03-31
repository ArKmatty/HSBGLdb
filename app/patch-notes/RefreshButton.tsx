"use client";

import { useState } from 'react';
import { RefreshCw, Clock } from 'lucide-react';

export default function RefreshButton() {
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/refresh-patch-notes', {
        method: 'POST',
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setMessage(`Found ${result.count || 0} patch notes`);
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setMessage(result.error || 'Refresh failed');
        }
      } else {
        setMessage('Refresh failed - not configured');
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      setMessage('Manual refresh not available');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid var(--border-mid)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontSize: 13,
          fontWeight: 500,
          cursor: refreshing ? 'not-allowed' : 'pointer',
          opacity: refreshing ? 0.7 : 1,
          transition: 'all 150ms',
        }}
        onMouseEnter={e => {
          if (!refreshing) {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border-mid)';
        }}
      >
        <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
      {message && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {message}
        </span>
      )}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
        <Clock size={12} />
        Auto-refreshes daily at 6pm UTC
      </span>
    </div>
  );
}
