'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { activityAPI, Insights } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { SkeletonBox, SkeletonText } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';

const FAVICON = (domain: string) =>
  `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;

const SITE_COLORS: Record<string, string> = {
  productive: '#10b981',
  distracting: '#ef4444',
};

// Categorizie each site into productive or distracting
const DISTRACTING = ['youtube', 'instagram', 'facebook', 'twitter', 'reddit', 'tiktok', 'netflix', 'snapchat', 'pinterest', 'twitch'];
const isDistracting = (site: string) => DISTRACTING.some(d => site.includes(d));

const fmtTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 rounded-2xl border text-sm shadow-xl"
         style={{ background: 'var(--surface)', borderColor: 'var(--border-color)' }}>
      <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {fmtTime(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function InsightsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState(7);

  const fetchData = useCallback(async (id: string, d = 7) => {
    setLoading(true); setError(false);
    try {
      const [insightsRes, statsRes] = await Promise.all([
        activityAPI.getInsights(id),
        activityAPI.getStats(id, d),
      ]);
      setInsights(insightsRes.insights);
      setStats(statsRes.stats);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('you2_user_id');
    if (!id) { router.push('/create-twin'); return; }
    setUserId(id);
    fetchData(id, days);
  }, [router, fetchData, days]);

  const score = insights?.productivityScore ?? 50;
  const scoreColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--orange)' : 'var(--red)';
  const circumference = 2 * Math.PI * 45;
  const strokeDash = (score / 100) * circumference;

  // Build chart data from daily breakdown
  const chartData = stats?.dailyBreakdown
    ? Object.entries(stats.dailyBreakdown).map(([date, data]: [string, any]) => ({
        date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Productive: data.productive || 0,
        Distracting: data.distracting || 0,
      }))
    : [];

  // Pie data — top sites split by category
  const pieData = stats?.topSites?.length
    ? [
        { name: 'Productive', value: stats.productiveTime || 0, fill: '#10b981' },
        { name: 'Distracting', value: stats.distractingTime || 0, fill: '#ef4444' },
      ]
    : [];

  const topSites: any[] = stats?.topSites?.slice(0, 5) || [];
  const maxSiteTime = topSites.reduce((m: number, s: any) => Math.max(m, s.duration), 0);

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Background orbs */}
      <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full blur-[140px] opacity-15 pointer-events-none" style={{ background: 'var(--purple)' }} />
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full blur-[140px] opacity-15 pointer-events-none" style={{ background: 'var(--green)' }} />

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 slide-up">
          <div>
            <h1 className="text-4xl font-black text-[var(--text-primary)]">Activity Intelligence</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Real data from Your² Extension — what you actually do online</p>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className="px-4 py-1.5 rounded-full text-sm font-bold transition-all"
                style={{
                  background: days === d ? 'var(--blue)' : 'var(--surface)',
                  color: days === d ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}>
                {d}D
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <SkeletonBox key={i} className="h-28" />)}
            </div>
            <SkeletonBox className="h-64" />
            <div className="grid md:grid-cols-2 gap-6">
              <SkeletonBox className="h-56" /><SkeletonBox className="h-56" />
            </div>
          </div>
        )}

        {error && <ErrorState onRetry={() => userId && fetchData(userId, days)} message="Failed to fetch activity data from the server." />}

        {!loading && !error && (
          <>
            {/* Stat Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Productivity Score', value: `${score}/100`, icon: '🎯', color: scoreColor },
                { label: 'Total Screen Time', value: fmtTime(stats?.totalTime || 0), icon: '🖥️', color: 'var(--blue)' },
                { label: 'Focus Time', value: fmtTime(stats?.productiveTime || 0), icon: '⚡', color: 'var(--green)' },
                { label: 'Lost Time', value: fmtTime(stats?.distractingTime || 0), icon: '📉', color: 'var(--red)' },
              ].map((s, i) => (
                <div key={i} className="glass-card p-5 rounded-2xl border hover:-translate-y-1 transition-transform duration-300"
                     style={{ borderColor: 'var(--border-color)' }}>
                  <div className="text-2xl mb-3">{s.icon}</div>
                  <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Main Charts Row */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">

              {/* Bar Chart — Daily Breakdown */}
              <div className="md:col-span-2 glass-card rounded-2xl p-6 border" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Daily Activity Breakdown</h2>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]"></span>Productive</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--red)]"></span>Distracting</span>
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} barSize={10} barGap={3}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Productive" fill="var(--green)" radius={[4,4,0,0]} />
                      <Bar dataKey="Distracting" fill="var(--red)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-4xl">📡</span>
                    <span className="text-sm">No data yet — install the Extension and browse a bit!</span>
                  </div>
                )}
              </div>

              {/* Pie Chart — Focus Split */}
              <div className="glass-card rounded-2xl p-6 border flex flex-col" style={{ borderColor: 'var(--border-color)' }}>
                <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Time Split</h2>
                {pieData.length > 0 && (pieData[0].value > 0 || pieData[1].value > 0) ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmtTime(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-5 mt-3">
                      {pieData.map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }}></span>
                          <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-3xl">🥧</span>
                    <span className="text-xs text-center">No split data yet</span>
                  </div>
                )}

                {/* Productivity ratio bar */}
                {(stats?.totalTime || 0) > 0 && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <span>Productivity Ratio</span>
                      <span className="font-bold" style={{ color: 'var(--green)' }}>{stats.productivityRatio}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                           style={{ width: `${stats.productivityRatio}%`, background: 'linear-gradient(90deg, var(--green), var(--cyan))' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top 5 Sites + Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">

              {/* Top 5 Sites */}
              <div className="glass-card rounded-2xl p-6 border" style={{ borderColor: 'var(--border-color)' }}>
                <h2 className="text-sm font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
                  🌐 Most Visited Sites
                </h2>
                {topSites.length > 0 ? (
                  <div className="space-y-4">
                    {topSites.map((s: any, i: number) => {
                      const pct = maxSiteTime > 0 ? (s.duration / maxSiteTime) * 100 : 0;
                      const distract = isDistracting(s.site);
                      const barColor = distract ? 'var(--red)' : 'var(--green)';
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <div className="relative w-6 h-6 rounded-md overflow-hidden bg-[var(--surface2)] flex-shrink-0">
                              <img
                                src={FAVICON(s.site)}
                                alt={s.site}
                                className="w-full h-full object-contain"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                            <span className="text-sm flex-1 truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                              {s.site.replace('www.', '')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold`}
                                  style={{ background: distract ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: distract ? 'var(--red)' : 'var(--green)' }}>
                              {distract ? 'Distract' : 'Focus'}
                            </span>
                            <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                              {fmtTime(s.duration)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden ml-9" style={{ background: 'var(--surface2)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                                 style={{ width: `${pct}%`, background: barColor, animationDelay: `${i * 0.1}s` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-3xl block mb-2">🌐</span>
                    <span className="text-sm">No sites tracked yet. Install the Extension!</span>
                  </div>
                )}
              </div>

              {/* Behavior Patterns */}
              <div className="glass-card rounded-2xl p-6 border" style={{ borderColor: 'var(--border-color)' }}>
                <h2 className="text-sm font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
                  🧬 Detected Behavior Patterns
                </h2>
                {insights?.behaviorPatterns?.length ? (
                  <div className="space-y-3">
                    {insights.behaviorPatterns.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface2)] transition-colors"
                           style={{ border: '1px solid var(--border-color)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                             style={{ background: i % 2 === 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: i % 2 === 0 ? 'var(--green)' : 'var(--red)' }}>
                          {p.frequency}×
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{p.pattern}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            Last: {new Date(p.lastOccurrence).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-3xl block mb-2">🧬</span>
                    <span className="text-sm">Patterns form as you interact more.</span>
                  </div>
                )}

                {/* Interaction counts row */}
                <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  {[
                    { label: 'Reflections', val: insights?.chatCount ?? 0, color: 'var(--purple)' },
                    { label: 'Simulations', val: insights?.simulationCount ?? 0, color: 'var(--blue)' },
                    { label: 'Action Plans', val: insights?.actionCount ?? 0, color: 'var(--green)' },
                  ].map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="text-xl font-black" style={{ color: s.color }}>{s.val}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Productivity Score Ring - full-width footer card */}
            <div className="glass-card rounded-2xl p-6 border flex flex-col sm:flex-row items-center gap-6"
                 style={{ borderColor: 'var(--border-color)' }}>
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="var(--surface2)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke={scoreColor} strokeWidth="8"
                    strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black" style={{ color: scoreColor }}>{score}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                  Twin Productivity Score
                </h3>
                <p className="text-sm mb-3" style={{ color: scoreColor }}>
                  {score >= 70 ? '🔥 You are operating at peak level. Protect this momentum.' : score >= 40 ? '📈 Progress is visible — tighten the focus window.' : '⚠️ You\'re losing ground. Let\'s intervene now.'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Composite of {stats?.totalActivities ?? 0} tracked events · updates live via extension
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
