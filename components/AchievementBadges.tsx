import { Trophy, Zap, Flame, Target, Lock } from 'lucide-react';
import { useState } from 'react';

interface Achievement {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  unlocked: boolean;
  hint?: string;
}

interface AchievementBadgesProps {
  currentRank: number;
  gamesPlayed: number;
  gain7d: number;
}

export default function AchievementBadges({ currentRank, gamesPlayed, gain7d }: AchievementBadgesProps) {
  const achievements: Achievement[] = [
    {
      id: 'top-100',
      label: 'Top 100',
      icon: <Trophy size={16} />,
      color: '#34d399',
      unlocked: currentRank <= 100 && currentRank > 0,
      hint: 'Rank in top 100',
    },
    {
      id: 'top-10',
      label: 'Top 10',
      icon: <Flame size={16} />,
      color: '#f87171',
      unlocked: currentRank <= 10 && currentRank > 0,
      hint: 'Rank in top 10',
    },
    {
      id: 'hot-streak',
      label: 'Hot Streak',
      icon: <Zap size={16} />,
      color: '#f87171',
      unlocked: gain7d >= 100,
      hint: 'Gain 100+ MMR in 7 days',
    },
    {
      id: 'veteran',
      label: 'Veteran',
      icon: <Target size={16} />,
      color: '#8b8fa3',
      unlocked: gamesPlayed >= 50,
      hint: 'Play 50+ tracked games',
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Achievements
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: 'var(--accent)',
            background: 'var(--accent-dim)', padding: '2px 6px', borderRadius: 4,
          }}>
            {unlockedCount}/{achievements.length}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, position: 'relative' }}>
        {achievements.map(a => (
          <div
            key={a.id}
            role="img"
            aria-label={`${a.label}: ${a.unlocked ? 'Unlocked' : 'Locked'} - ${a.hint}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${a.unlocked ? `${a.color}40` : 'var(--border-dim)'}`,
              background: a.unlocked ? `${a.color}10` : 'var(--bg-elevated)',
              color: a.unlocked ? a.color : 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 600,
              opacity: a.unlocked ? 1 : 0.6,
              transition: 'opacity 150ms, transform 150ms, box-shadow 150ms',
              cursor: a.unlocked ? 'default' : 'help',
              boxShadow: a.unlocked ? `0 0 8px ${a.color}20` : 'none',
              position: 'relative',
            }}
            onMouseEnter={e => {
              setHoveredId(a.id);
              if (a.unlocked) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = `0 2px 12px ${a.color}30`;
              }
            }}
            onMouseLeave={e => {
              setHoveredId(null);
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = a.unlocked ? `0 0 8px ${a.color}20` : 'none';
            }}
          >
            {!a.unlocked && <Lock size={10} style={{ opacity: 0.7 }} />}
            {a.icon}
            {a.label}

            {/* Tooltip for locked achievements */}
            {!a.unlocked && hoveredId === a.id && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '6px 10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-mid)',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                🔒 {a.hint}
                {/* Arrow */}
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: `5px solid var(--border-mid)`,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
