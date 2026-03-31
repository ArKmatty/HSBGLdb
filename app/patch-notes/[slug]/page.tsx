import type { Metadata } from 'next';
import { getPatchNotes } from '@/lib/patchNotes';
import Link from 'next/link';

interface PatchNotePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PatchNotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const patchNotes = await getPatchNotes(50);
  const patch = patchNotes.find(p => p.id === slug);
  
  if (!patch) {
    return { title: 'Patch Note Not Found' };
  }

  return {
    title: `${patch.title} | Battlegrounds Patch Notes`,
    description: patch.summary || `Battlegrounds patch notes for ${patch.title}`,
  };
}

export async function generateStaticParams() {
  const patchNotes = await getPatchNotes(50);
  return patchNotes.map(p => ({ slug: p.id }));
}

export default async function PatchNotePage({ params }: PatchNotePageProps) {
  const { slug } = await params;
  const patchNotes = await getPatchNotes(50);
  const patch = patchNotes.find(p => p.id === slug);

  if (!patch) {
    return (
      <main style={{ minHeight: '100dvh', background: 'var(--bg-base)', padding: '40px 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Link href="/patch-notes" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            ← Back to Patch Notes
          </Link>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 24 }}>Patch Note Not Found</h1>
        </div>
      </main>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const [month, day, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 64px' }}>
        <Link 
          href="/patch-notes" 
          style={{ 
            color: 'var(--accent)', 
            textDecoration: 'none', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 8, 
            marginBottom: 24,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          ← Back to Patch Notes
        </Link>

        <article style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
          {patch.image_url ? (
            <div style={{ position: 'relative', height: 280, overflow: 'hidden' }}>
              <img 
                src={patch.image_url} 
                alt={patch.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-surface) 0%, transparent 50%)' }} />
            </div>
          ) : (
            <div style={{ height: 200, background: 'linear-gradient(135deg, var(--accent) 0%, var(--bg-elevated) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 64, fontWeight: 800, color: 'var(--bg-base)', opacity: 0.2 }}>BG</span>
            </div>
          )}

          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ background: 'var(--accent)', color: '#000', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Battlegrounds
              </span>
              <span style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 12, padding: '4px 10px', borderRadius: 6 }}>
                {formatDate(patch.date)}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px', lineHeight: 1.2 }}>
              {patch.title}
            </h1>

            {patch.summary && (
              <p style={{ fontSize: 18, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
                {patch.summary}
              </p>
            )}

            <a
              href={patch.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginBottom: 24,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-mid)',
                background: 'var(--bg-elevated)',
                color: 'var(--accent)',
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              View Original Source →
            </a>

            {patch.battlegrounds_changes && (
              <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>
                  Battlegrounds Changes
                </h2>
                <div 
                  style={{ 
                    fontSize: 14, 
                    color: 'var(--text-secondary)', 
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 'none',
                    overflow: 'visible',
                  }}
                >
                  {patch.battlegrounds_changes}
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}