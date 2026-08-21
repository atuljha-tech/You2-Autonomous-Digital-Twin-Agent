'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface ActivityEntry {
  site: string;
  duration: number; // seconds
  timestamp: string;
  productive: boolean;
}

interface ActivityGraphProps {
  activities: ActivityEntry[];
  topSites?: { site: string; duration: number; minutes: number }[];
  stats?: {
    totalTime: number;
    productiveTime: number;
    distractingTime: number;
    productivityRatio: number;
  };
}

const FAVICON = (domain: string) =>
  `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;

const DISTRACTING = ['youtube', 'instagram', 'facebook', 'twitter', 'reddit', 'tiktok', 'netflix', 'snapchat', 'twitch'];
const isDistracting = (site: string) => DISTRACTING.some(d => site.includes(d));

const fmtTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  if (m < 1) return `${seconds}s`;
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const CustomBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="px-3 py-2 rounded-xl border text-xs shadow-xl"
      style={{ background: 'var(--surface)', borderColor: 'var(--border-color)' }}>
      <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{d.label}</p>
      <p style={{ color: d.color }}>{fmtTime(d.seconds)}</p>
    </div>
  );
};

export default function ActivityGraph({ activities, topSites, stats }: ActivityGraphProps) {
  // Build per-site aggregation from raw activities if topSites not provided
  const siteData = useMemo(() => {
    if (topSites && topSites.length > 0) {
      return topSites.slice(0, 8).map(s => ({
        label: s.site.replace('www.', '').split('.')[0],
        fullSite: s.site,
        seconds: s.duration,
        minutes: s.minutes,
        color: isDistracting(s.site) ? '#ef4444' : '#10b981',
        distract: isDistracting(s.site),
      }));
    }

    const map: Record<string, number> = {};
    activities.forEach(a => {
      map[a.site] = (map[a.site] || 0) + a.duration;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([site, seconds]) => ({
        label: site.replace('www.', '').split('.')[0],
        fullSite: site,
        seconds,
        minutes: Math.floor(seconds / 60),
        color: isDistracting(site) ? '#ef4444' : '#10b981',
        distract: isDistracting(site),
      }));
  }, [activities, topSites]);

  const hasData = siteData.length > 0;
  const maxSeconds = hasData ? Math.max(...siteData.map(d => d.seconds)) : 0;

  if (!hasData) {
    return (
      <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            🌐 Site Activity
          </h2>
        </div>
        <div className="h-40 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <span className="text-3xl">📡</span>
          <p className="text-sm text-center">No activity yet — install the Chrome Extension!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>🌐 Site Activity</h2>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Time spent per website today</p>
        </div>
        <div className="flex gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#10b981' }} />Focus
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ef4444' }} />Distract
          </span>
        </div>
      </div>

      {/* Summary pills */}
      {stats && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { label: 'Total', val: fmtTime(stats.totalTime), color: 'var(--text-primary)', bg: 'var(--surface2)' },
            { label: 'Focus', val: fmtTime(stats.productiveTime), color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
            { label: 'Distract', val: fmtTime(stats.distractingTime), color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
            { label: 'Ratio', val: `${stats.productivityRatio}%`, color: 'var(--blue)', bg: 'rgba(59,130,246,0.08)' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: s.bg, color: s.color }}>
              {s.label}: {s.val}
            </div>
          ))}
        </div>
      )}

      {/* Bar chart */}
      <div className="h-36 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={siteData} barSize={18} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="seconds" radius={[4, 4, 0, 0]}>
              {siteData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Site list with horizontal bars */}
      <div className="space-y-2">
        {siteData.slice(0, 5).map((s, i) => {
          const pct = maxSeconds > 0 ? (s.seconds / maxSeconds) * 100 : 0;
          return (
            <div key={i} className="flex items-center gap-2.5 group">
              {/* Favicon */}
              <div className="w-5 h-5 rounded-md overflow-hidden bg-[var(--surface2)] shrink-0 flex items-center justify-center">
                <img
                  src={FAVICON(s.fullSite)}
                  alt={s.label}
                  className="w-4 h-4 object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              {/* Bar + label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {s.fullSite.replace('www.', '')}
                  </span>
                  <span className="text-[10px] font-bold tabular-nums ml-2 shrink-0" style={{ color: s.color }}>
                    {fmtTime(s.seconds)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: s.color, opacity: 0.8 }}
                  />
                </div>
              </div>
              {/* Tag */}
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                style={{
                  background: s.distract ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                  color: s.distract ? '#ef4444' : '#10b981',
                }}>
                {s.distract ? '⚠' : '✓'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
