import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Commish Command - Fantasy Football Dashboard';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #a855f7, #ec4899, #8b5cf6)',
            display: 'flex',
          }}
        />

        {/* Glow effect */}
        <div
          style={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #a855f726 0%, transparent 70%)',
            top: '-100px',
            right: '-100px',
            display: 'flex',
          }}
        />

        {/* Trophy icon */}
        <div style={{ fontSize: 80, marginBottom: 20, display: 'flex' }}>
          🏆
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#f8fafc',
            letterSpacing: '-2px',
            display: 'flex',
            lineHeight: 1.1,
          }}
        >
          Commish Command
        </div>

        {/* Divider */}
        <div
          style={{
            width: 120,
            height: 4,
            background: 'linear-gradient(90deg, #a855f7, #ec4899)',
            borderRadius: 2,
            margin: '24px 0',
            display: 'flex',
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#94a3b8',
            fontWeight: 500,
            letterSpacing: '4px',
            textTransform: 'uppercase' as const,
            display: 'flex',
          }}
        >
          Your League. Your Rules. Your Regime.
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: 'flex',
            gap: 48,
            marginTop: 40,
            color: '#64748b',
            fontSize: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#a855f7', fontWeight: 700, fontSize: 22 }}>12</span>
            <span>Seasons</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#ec4899', fontWeight: 700, fontSize: 22 }}>1000+</span>
            <span>Matchups</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 22 }}>2400+</span>
            <span>Draft Picks</span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #a855f7, #ec4899, #8b5cf6)',
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
