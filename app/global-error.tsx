'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: '#0a0c10',
          color: '#e8eaed',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, #f87171, transparent)',
          }} />
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            fontSize: 24,
            fontWeight: 800,
            color: '#f87171',
          }}>
            !
          </div>
          <h2 style={{
            fontSize: 20,
            fontWeight: 800,
            marginBottom: 8,
            color: '#e8eaed',
          }}>
            Application Error
          </h2>
          <p style={{
            fontSize: 14,
            color: '#4a4d5e',
            marginBottom: 24,
          }}>
            A critical error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#e8a838',
              color: '#0a0c10',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
