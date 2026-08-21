'use client';

import { useState, useEffect } from 'react';
import { forecastAPI, DailyForecast } from '@/lib/api';

interface DailyForecastCardProps {
  userId: string;
}

const energyConfig = {
  high: { label: 'High Energy', color: 'var(--green)', bg: 'rgba(16,185,129,0.08)', icon: '⚡', bar: 90 },
  medium: { label: 'Moderate', color: 'var(--orange)', bg: 'rgba(245,158,11,0.08)', icon: '🔆', bar: 55 },
  low: { label: 'Low Energy', color: 'var(--red)', bg: 'rgba(239,68,68,0.08)', icon: '🌙', bar: 25 },
};

export default function DailyForecastCard({ userId }: DailyForecastCardProps) {
  const [forecast, setForecast] = useState<DailyForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Cache forecast for 1 hour to avoid hammering the API
    const cacheKey = `you2_forecast_${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < 60 * 60 * 1000) {
          setForecast(data);
          setLoading(false);
          return;
        }
      } catch {}
    }

    forecastAPI.getDaily(userId)
      .then(res => {
        setForecast(res.forecast);
        localStorage.setItem(cacheKey, JSON.stringify({ data: res.forecast, ts: Date.now() }));
      })
      .catch(() => {/* silently fail — non-critical */})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="glass-card p-5 rounded-2xl border animate-pulse" style={{ borderColor: 'var(--border-color)' }}>
        <div className="h-4 w-1/3 rounded-lg bg-[var(--surface2)] mb-3" />
        <div className="h-6 w-3/4 rounded-lg bg-[var(--surface2)] mb-2" />
        <div className="h-3 w-1/2 rounded-lg bg-[var(--surface2)]" />
      </div>
    );
  }

  if (!forecast) return null;

  const energy = energyConfig[forecast.energyForecast] || energyConfig.medium;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div
      className="glass-card rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
      style={{ borderColor: 'var(--border-color)' }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Top gradient strip */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, var(--purple), var(--cyan))` }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Daily Forecast
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: energy.bg, color: energy.color }}>
                {energy.icon} {energy.label}
              </span>
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{dateStr} · {timeStr}</p>
          </div>
          <span className="text-[10px] font-bold transition-transform duration-300"
            style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
            ▾
          </span>
        </div>

        {/* Headline — always visible */}
        <p className="text-sm font-bold leading-snug mb-3" style={{ color: 'var(--text-primary)' }}>
          {forecast.headline}
        </p>

        {/* Energy bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Energy Level</span>
            <span style={{ color: energy.color }}>{energy.bar}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${energy.bar}%`, background: `linear-gradient(90deg, ${energy.color}, var(--cyan))` }} />
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="space-y-3 mt-4 pt-4 border-t slide-up" style={{ borderColor: 'var(--border-color)' }}>

            {/* Focus Windows */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                🎯 Peak Focus Windows
              </p>
              <div className="flex flex-wrap gap-2">
                {forecast.focusWindows.map((w, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--blue)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    ⏰ {w}
                  </span>
                ))}
              </div>
            </div>

            {/* Risk Alert */}
            <div className="p-3 rounded-xl flex items-start gap-2"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <span className="text-sm shrink-0">⚠️</span>
              <div>
                <p className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--red)' }}>Risk Alert</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{forecast.riskAlert}</p>
              </div>
            </div>

            {/* Top Priority */}
            <div className="p-3 rounded-xl flex items-start gap-2"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <span className="text-sm shrink-0">🎯</span>
              <div>
                <p className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--green)' }}>Top Priority Today</p>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{forecast.topPriority}</p>
              </div>
            </div>

            {/* Predicted Score */}
            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border-color)' }}>
              <div>
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Predicted Score Today</p>
                <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-secondary)' }}>
                  "{forecast.motivationalPulse}"
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black"
                  style={{ color: forecast.predictedScore >= 70 ? 'var(--green)' : forecast.predictedScore >= 40 ? 'var(--orange)' : 'var(--red)' }}>
                  {forecast.predictedScore}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/100</span>
              </div>
            </div>
          </div>
        )}

        {!expanded && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Tap to see focus windows, risks & priority →
          </p>
        )}
      </div>
    </div>
  );
}
