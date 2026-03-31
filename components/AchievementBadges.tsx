import { Trophy, Star, Zap, Crown, Flame, Target } from 'lucide-react';

interface Achievement {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  unlocked: boolean;
  hint?: string;
}

interface AchievementBadgesProps {
  peakMmr: number;
  currentMmr: number;
  currentRank: number;
  gamesPlayed: number;
  gain7d: number;
}

export default function AchievementBadges({ peakMmr, currentRank, gamesPlayed, gain7d }: Omit<AchievementBadgesProps, 'currentMmr'>) {
  const achievements: Achievement[] = [
    {
      id: 'peak-5000',
      label: '5K MMR Club',
      icon: <Crown size={16} />,
      color: '#e8a838',
      unlocked: peakMmr >= 5000,
      hint: 'Reach 5000 MMR',
    },
    {
      id: 'peak-6000',
      label: 'Legend',
      icon: <Star size={16} />,
      color: '#a78bfa',
      unlocked: peakMmr >= 6000,
      hint: 'Reach 6000 MMR',
    },
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {achievements.map(a => (
          <div
            key={a.id}
            title={a.hint}
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
              opacity: a.unlocked ? 1 : 0.5,
              transition: 'all 150ms',
              cursor: 'default',
            }}
          >
            {a.icon}
            {a.label}
          </div>
        ))}
      </div>
    </div>
  );
}
