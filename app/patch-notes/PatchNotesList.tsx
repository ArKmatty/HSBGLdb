"use client";

import Link from 'next/link';
import { ScrollText } from 'lucide-react';

interface PatchNote {
  id: string;
  title: string;
  date: string;
  url: string;
  image_url?: string;
  summary: string;
  battlegrounds_changes: string;
}

interface PatchNotesListProps {
  patchNotes: PatchNote[];
}

export default function PatchNotesList({ patchNotes }: PatchNotesListProps) {
  if (!patchNotes || patchNotes.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        gap: 12,
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}>
        <ScrollText size={32} style={{ opacity: 0.4, marginBottom: 4 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          No patch notes available yet
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Patch notes will appear here once available
        </span>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const [month, day, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 20,
    }}>
      {patchNotes.map((patch, idx) => (
        <Link
          key={patch.id}
          href={`/patch-notes/${patch.id}`}
          className="animate-fade-in"
          style={{
            display: 'block',
            background: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px solid var(--border-dim)',
            overflow: 'hidden',
            textDecoration: 'none',
            transition: 'box-shadow 200ms, transform 200ms',
            animationDelay: `${idx * 0.05}s`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{
            position: 'relative',
            height: 140,
            background: patch.image_url 
              ? `url(${patch.image_url}) center/cover no-repeat` 
              : 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
            overflow: 'hidden',
          }}>
            {!patch.image_url && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                fontWeight: 800,
                color: 'var(--accent)',
                opacity: 0.15,
                letterSpacing: '-0.02em',
              }}>
                BG
              </div>
            )}
            <div style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: 'var(--accent)',
              color: '#000',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Battlegrounds
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <h2 style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
              lineHeight: 1.3,
            }}>
              {patch.title.replace(/ Patch Notes$/i, '')}
            </h2>
            {patch.summary && (
              <p style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                margin: '0 0 12px',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {patch.summary}
              </p>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}>
              <span>Blizzard Entertainment</span>
              <span>{formatDate(patch.date)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}