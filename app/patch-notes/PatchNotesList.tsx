"use client";

import { useState } from 'react';
import { ChevronDown, ScrollText } from 'lucide-react';

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {patchNotes.map((patch, idx) => (
        <article
          key={patch.id}
          className="animate-fade-in"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px solid var(--border-dim)',
            overflow: 'hidden',
            animationDelay: `${idx * 0.05}s`,
          }}
        >
          <div
            style={{
              padding: 20,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
            }}
            onClick={() => toggleExpand(patch.id)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 6,
                flexWrap: 'wrap',
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  background: 'var(--accent-dim)',
                  padding: '3px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  BG
                </span>
                <span style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}>
                  {formatDate(patch.date)}
                </span>
              </div>
              <h2 style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.3,
              }}>
                {patch.title.replace(/ Patch Notes$/i, '')}
              </h2>
              {patch.summary && (
                <p style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  margin: '8px 0 0',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {patch.summary}
                </p>
              )}
            </div>
            <div style={{
              color: 'var(--text-muted)',
              flexShrink: 0,
              transition: 'transform 150ms',
              transform: expanded[patch.id] ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>
              <ChevronDown size={20} />
            </div>
          </div>

          {expanded[patch.id] && (
            <div style={{
              padding: '0 20px 20px',
              borderTop: '1px solid var(--border-dim)',
            }}>
              <div style={{ paddingTop: 16 }}>
                <h3 style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 12,
                }}>
                    Battlegrounds Changes
                </h3>
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 400,
                  overflow: 'auto',
                }}>
                  {patch.battlegrounds_changes}
                </div>
              </div>
              <a
                href={patch.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 16,
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border-mid)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: 'none',
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
                View Full Patch Notes
              </a>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
