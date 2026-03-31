"use client";

export function Skeleton({
  width = "100%",
  height = 16,
  radius = 6,
  style,
}: {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="animate-shimmer"
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

export function LeaderboardSkeleton() {
  return (
    <div style={{ padding: '24px 0' }}>
      <Skeleton height={44} radius={12} style={{ marginBottom: 20 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Skeleton width={80} height={12} />
        <Skeleton width={60} height={12} />
      </div>
      <div style={{ borderRadius: 10, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              gap: 16,
              borderTop: i > 0 ? '1px solid var(--border-dim)' : 'none',
            }}
          >
            <Skeleton width={40} height={16} />
            <Skeleton width={160} height={16} />
            <Skeleton width={80} height={16} />
            <Skeleton width={60} height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlayerStatsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          style={{
            padding: 16,
            background: 'var(--bg-surface)',
            borderRadius: 10,
            border: '1px solid var(--border-dim)',
          }}
        >
          <Skeleton width={60} height={10} radius={4} />
          <Skeleton width={80} height={24} radius={4} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div style={{ height: 'clamp(250px, 45vw, 400px)' }}>
      <Skeleton height={32} radius={8} style={{ marginBottom: 12, width: 120 }} />
      <Skeleton height="100%" radius={10} />
    </div>
  );
}
