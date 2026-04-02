"use client";
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      aria-label={copied ? 'Copied' : `Copy ${label || 'text'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 6,
        background: copied ? 'rgba(52,211,153,0.1)' : 'transparent',
        border: '1px solid',
        borderColor: copied ? 'rgba(52,211,153,0.3)' : 'var(--border-dim)',
        color: copied ? 'var(--green)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
      onMouseEnter={e => {
        if (!copied) {
          e.currentTarget.style.borderColor = 'var(--text-muted)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={e => {
        if (!copied) {
          e.currentTarget.style.borderColor = 'var(--border-dim)';
          e.currentTarget.style.color = 'var(--text-muted)';
        }
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      <span>{copied ? 'Copied' : label || 'Copy'}</span>
    </button>
  );
}
