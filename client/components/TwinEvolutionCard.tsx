'use client';

import { useState, useEffect } from 'react';
import { forecastAPI, TwinEvolution, TwinEvolutionMeta } from '@/lib/api';

interface TwinEvolutionCardProps {
  userId: string;
}

const LEVEL_CONFIG: Record<string, { color: string; bg: string; icon: string; order: number }> = {
  Developing: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '🌱', order: 1 },
  Aware:      { color: 'var(--blue)', bg: 'rgba(59,130,246,0.1)', icon: '👁️', order: 2 },
  Calibrated: { color: 'var(--cyan)', bg: 'rgba(6,182,212,0.1)', icon: '🎯', order: 3 },
  Advanced:   { color: 'var(--purple)', bg: 'rgba(139,92,246,0.1)', icon: '⚡', order: 4 },
  Expert:     { color: 'var(--green)', bg: 'rgba(16,185,129,0.1)', icon: '🧠', order: 5 },
};

const LEVELS = ['Developing', 'Aware', 'Calibrated', 'Advanced', 'Expert'];

interface StatRingProps {
  value: number;
  label: string;
  color: string;
  size?: number;
}

function StatRing({ value, label, color, size = 56 }: StatRingProps) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface2)" strokeWidth="4" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: 'var(--text-muted)', maxWidth: size }}>
        {label}
      </span>
    </div>
  );
}

export default function TwinEvolutionCard({ userId }: TwinEvolutionCardProps) {
  const [evolution, setEvolution] = useState<TwinEvolution | null>(null);
  const [meta, setMeta] = useState<TwinEvolutionMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cache for 30 minutes
    const cacheKey = `you2_evolution_${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < 30 * 60 * 1000) {
          setEvolution(data.evolution);
          setMeta(data.meta);
          setLoading(false);
          return;
        }
      } catch {}
    }

    forecastAPI.getEvolution(userId)
      .then(res => {
        setEvolution(res.evolution);
        setMeta(res.meta);
        localStorage.setItem(cacheKey, JSON.stringify({ data: res, ts: Date.now() }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="glass-card p-5 rounded-2xl border animate-pulse" style={{ borderColor: 'var(--border-color)' }}>
        <div className="h-4 w-1/2 rounded-lg bg-[var(--surface2)] mb-4" />
        <div className="flex gap-4 justify-around">
          {[1, 2, 3].map(i => <div key={i} className="w-14 h-14 rounded-full bg-[var(--surface2)]" />)}
        </div>
      </div>
    );
  }

  if (!evolution || !meta) return null;

  const levelCfg = LEVEL_CONFIG[evolution.evolutionLevel] || LEVEL_CONFIG.Developing;
  const currentLevelIdx = LEVELS.indexOf(evolution.evolutionLevel);

  return (
    <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>🧬 Twin Evolution</h2>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {meta.daysSinceCreation}d active · {meta.totalInteractions} interactions
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-bold"
          style={{ background: levelCfg.bg, color: levelCfg.color }}>
          {levelCfg.icon} {evolution.evolutionLevel}
        </span>
      </div>

      {/* Level progress track */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Level Progress</span>
          <span className="text-[10px] font-bold" style={{ color: levelCfg.color }}>{evolution.levelProgress}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${evolution.levelProgress}%`, background: `linear-gradient(90deg, ${levelCfg.color}, var(--cyan))` }} />
        </div>
        {/* Level dots */}
        <div className="flex justify-between mt-2">
          {LEVELS.map((lvl, i) => (
            <div key={lvl} className="flex flex-col items-center gap-0.5">
              <div className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: i <= currentLevelIdx ? LEVEL_CONFIG[lvl].color : 'var(--surface2)',
                  boxShadow: i === currentLevelIdx ? `0 0 6px ${levelCfg.color}` : 'none',
                }} />
              <span className="text-[8px] hidden sm:block" style={{ color: i <= currentLevelIdx ? LEVEL_CONFIG[lvl].color : 'var(--text-muted)' }}>
                {lvl.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stat rings */}
      <div className="flex justify-around py-2 mb-4">
        <StatRing value={evolution.accuracyScore} label="Accuracy" color="var(--purple)" />
        <StatRing value={evolution.predictionConfidence} label="Confidence" color="var(--blue)" />
        <StatRing value={Math.min(100, evolution.habitsLearned * 10)} label="Habits" color="var(--green)" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Habits Learned', value: evolution.habitsLearned, color: 'var(--green)' },
          { label: 'Weekly Growth', value: `+${evolution.weeklyGrowth}%`, color: 'var(--cyan)' },
          { label: 'Tasks Done', value: meta.completedTasks, color: 'var(--purple)' },
        ].map((s, i) => (
          <div key={i} className="text-center p-2 rounded-xl" style={{ background: 'var(--surface2)' }}>
            <div className="text-base font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Strongest insight */}
      <div className="p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--purple)' }}>💡 Strongest Insight</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {evolution.strongestInsight}
        </p>
      </div>

      {/* Next milestone */}
      <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
        Next: {evolution.nextMilestone}
      </p>
    </div>
  );
}
