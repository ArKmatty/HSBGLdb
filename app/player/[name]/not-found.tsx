import Link from 'next/link';

export default function PlayerNotFound() {
  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'var(--bg-base)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{
          fontSize: 64,
          fontWeight: 900,
          color: 'var(--accent)',
          letterSpacing: '-0.04em',
          marginBottom: 8,
        }}>
          404
        </div>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}>
          Player not found
        </h2>
        <p style={{
          fontSize: 14,
          color: 'var(--text-muted)',
          marginBottom: 24,
          lineHeight: 1.5,
        }}>
          We couldn&apos;t find any MMR history for this player. They may be new, or the name might be misspelled.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            padding: '12px 24px',
            borderRadius: 8,
            background: 'var(--accent)',
            color: 'var(--bg-base)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Back to leaderboard
        </Link>
      </div>
    </main>
  );
}
