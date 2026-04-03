export default function Loading() {
  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg-base)' }} aria-busy="true" aria-label="Loading">
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px 64px' }}>
        <div style={{ width: '60%', height: 28, borderRadius: 6, background: 'var(--bg-subtle)', marginBottom: 8 }} className="animate-shimmer" />
        <div style={{ width: '40%', height: 12, borderRadius: 4, background: 'var(--bg-subtle)', marginBottom: 32 }} className="animate-shimmer" />
        <div style={{ width: '100%', height: 260, borderRadius: 10, background: 'var(--bg-subtle)' }} className="animate-shimmer" />
      </div>
    </main>
  );
}
