"use client";

import { AlertCircle, SearchX, WifiOff, FileQuestion } from "lucide-react";

interface EmptyStateProps {
  type: "no-results" | "no-data" | "error" | "offline";
  title: string;
  description?: string;
}

export function EmptyState({ type, title, description }: EmptyStateProps) {
  const icons = {
    "no-results": SearchX,
    "no-data": FileQuestion,
    "error": AlertCircle,
    "offline": WifiOff,
  };

  const Icon = icons[type];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        gap: 12,
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}
    >
      <Icon size={32} style={{ opacity: 0.4, marginBottom: 4 }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
        {title}
      </span>
      {description && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280 }}>
          {description}
        </span>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        gap: 12,
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}
    >
      <AlertCircle size={32} style={{ color: 'var(--red)', opacity: 0.6, marginBottom: 4 }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>
        {title}
      </span>
      {message && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280 }}>
          {message}
        </span>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid var(--border-mid)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.background = 'var(--accent-dim)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-mid)';
            e.currentTarget.style.background = 'var(--bg-elevated)';
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
