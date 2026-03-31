export default function Loading() {
  return (
    <main style={{ minHeight: '100dvh' }} aria-busy="true" aria-label="Loading">
      <header style={{
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ width: 24, height: 16, borderRadius: 4, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
              <div style={{ width: 70, height: 10, borderRadius: 4, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
            </div>
            <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--bg-base)', borderRadius: 8 }}>
              {['EU', 'US', 'AP', 'CN'].map((r) => (
                <div key={r} style={{ width: 48, height: 36, borderRadius: 6, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ width: 180, height: 28, borderRadius: 6, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite', marginBottom: 6 }} />
            <div style={{ width: 140, height: 12, borderRadius: 4, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px 64px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
            <div style={{ width: 80, height: 10, borderRadius: 4, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ width: 80 + i * 20, height: 34, borderRadius: 8, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={{ width: 13, height: 13, borderRadius: 4, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
            <div style={{ width: 100, height: 10, borderRadius: 4, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: 80, borderRadius: 8, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ width: '100%', height: 44, borderRadius: 12, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
        </div>

        <div style={{ borderRadius: 10, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-elevated)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 60px 40px', gap: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 10, borderRadius: 4, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
              ))}
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: '12px 16px', borderTop: '1px solid var(--border-dim)', display: 'grid', gridTemplateColumns: '50px 1fr 60px 40px', gap: 8 }}>
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} style={{ height: 14, borderRadius: 4, background: 'var(--bg-subtle)', animation: 'pulse 2s infinite' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
