import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const playerName = decodeURIComponent(name as string);

  const { searchParams } = new URL(request.url);
  const rating = searchParams.get('rating') || '0';
  const rank = searchParams.get('rank') || '-';
  const region = searchParams.get('region') || 'EU';
  const peak = searchParams.get('peak') || '0';

  // Use Google Fonts Inter
  const Inter = await fetch(
    'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
  ).then((res) => res.arrayBuffer());

  const formatNumber = (num: string) => {
    const n = parseInt(num, 10);
    return n.toLocaleString();
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0c10 0%, #1a1d28 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background accent */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(232,168,56,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#8b8fa3',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            HS BG Leaderboard
          </div>

          {/* Player Name */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: '#e8eaed',
              letterSpacing: '-0.02em',
              textAlign: 'center',
              maxWidth: '800px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {playerName}
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: 'flex',
              gap: 32,
              marginTop: 8,
            }}
          >
            {/* Current MMR */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  color: '#e8a838',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatNumber(rating)}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#4a4d5e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                MMR
              </div>
            </div>

            {/* Rank */}
            {rank !== '-' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 800,
                    color: '#e8eaed',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  #{rank}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#4a4d5e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Rank
                </div>
              </div>
            )}

            {/* Peak */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  color: '#a78bfa',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatNumber(peak)}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#4a4d5e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Peak
              </div>
            </div>
          </div>

          {/* Region Badge */}
          <div
            style={{
              marginTop: 16,
              padding: '8px 20px',
              background: 'rgba(232,168,56,0.1)',
              border: '1px solid rgba(232,168,56,0.3)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 8px rgba(52,211,153,0.5)',
              }}
            />
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#e8a838',
              }}
            >
              {region} Region
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: 32,
            fontSize: 14,
            color: '#4a4d5e',
            fontWeight: 500,
          }}
        >
          hearthstone-leaderboard.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: Inter
        ? [
            {
              name: 'Inter',
              data: Inter,
              style: 'normal',
              weight: 400,
            },
          ]
        : undefined,
    }
  );
}
