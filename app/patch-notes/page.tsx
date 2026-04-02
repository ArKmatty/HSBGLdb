import type { Metadata } from 'next';
import { getPatchNotes } from '@/lib/patchNotes';
import PatchNotesList from './PatchNotesList';
import RefreshButton from './RefreshButton';

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://hsbg-ldb.vercel.app';
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getBaseUrl();
  const patchNotes = await getPatchNotes(1);
  const latestPatch = patchNotes[0];

  return {
    title: 'Battlegrounds Patch Notes — HSBGLdb',
    description: latestPatch?.summary || 'Latest Hearthstone Battlegrounds patch notes, balance changes, and meta updates. Stay current with the newest BG changes.',
    openGraph: {
      title: 'Battlegrounds Patch Notes',
      description: 'Latest Hearthstone Battlegrounds patch notes and balance changes',
      url: `${baseUrl}/patch-notes`,
      type: 'article',
      siteName: 'HSBGLdb',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Battlegrounds Patch Notes',
      description: 'Latest Hearthstone Battlegrounds patch notes and balance changes',
    },
  };
}

export const revalidate = 3600;

export default async function PatchNotesPage() {
  const patchNotes = await getPatchNotes(20);

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <div style={{
        position: 'relative',
        borderBottom: '1px solid var(--border-dim)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        }} />

        <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                HS
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Leaderboard
              </span>
            </div>
            <RefreshButton />
          </div>

          <div style={{ marginBottom: 20 }}>
            <h1 style={{
              fontSize: 'clamp(22px, 4vw, 32px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: '0 0 4px',
              lineHeight: 1.2,
            }}>
            Battlegrounds Patch Notes
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 400 }}>
              Latest updates and changes from Hearthstone
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px 64px' }}>
        <PatchNotesList patchNotes={patchNotes} />
      </div>
    </main>
  );
}
