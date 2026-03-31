import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Hearthstone Battlegrounds';
  const subtitle = searchParams.get('subtitle') || 'Live MMR Rankings · All Regions';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0c10',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 56, fontWeight: 900, color: '#e8a838', letterSpacing: '-0.03em' }}>
            BG
          </span>
          <span style={{ fontSize: 28, fontWeight: 600, color: '#4a4d5e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Leaderboard
          </span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#e8eaed', letterSpacing: '-0.02em' }}>
          {title}
        </div>
        <div style={{ fontSize: 20, color: '#8b8fa3', fontWeight: 500 }}>
          {subtitle}
        </div>
        <div
          style={{
            marginTop: 24,
            width: 120,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #e8a838, transparent)',
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
