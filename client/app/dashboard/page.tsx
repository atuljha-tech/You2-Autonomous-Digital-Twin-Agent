'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { userAPI, activityAPI, User } from '@/lib/api';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardSkeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import DailyForecastCard from '@/components/DailyForecastCard';
import TwinEvolutionCard from '@/components/TwinEvolutionCard';
import ActivityGraph from '@/components/ActivityGraph';
import VoiceTwin from '@/components/VoiceTwin';

const fmtTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  if (m < 1) return `${seconds}s`;
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const DISTRACTING = ['youtube', 'instagram', 'facebook', 'twitter', 'reddit', 'tiktok', 'netflix', 'snapchat', 'twitch'];
const isDistracting = (site: string) => DISTRACTING.some(d => site.includes(d));
const FAVICON = (domain: string) => `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;

// ─── UserIdBadge — shows full ID with one-click copy ─────────────────────────

function UserIdBadge({ id, name }: { id: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5 transition-all hover:border-[var(--purple)]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
             style={{ background: 'linear-gradient(135deg, var(--purple), var(--blue))' }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left">
          <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{name}</p>
          <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            ID: {id.substring(0, 8)}… <span style={{ color: 'var(--blue)' }}>▾</span>
          </p>
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden slide-up"
               style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
            {/* Header */}
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--surface2)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>🔌 Connect Chrome Extension</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Copy your ID and paste it in the extension popup</p>
            </div>

            <div className="p-4 space-y-3">
              {/* Full ID display */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Your Twin ID</p>
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border-color)' }}>
                  <code className="flex-1 text-xs font-mono break-all leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {id}
                  </code>
                  <button
                    onClick={copy}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                    style={{
                      background: copied ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, var(--purple), var(--blue))',
                      color: copied ? 'var(--green)' : 'white',
                      border: copied ? '1px solid rgba(16,185,129,0.3)' : 'none',
                    }}
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {[
                  { n: '1', text: 'Click the You² icon in Chrome toolbar' },
                  { n: '2', text: 'Paste your ID above and click Connect' },
                  { n: '3', text: 'Browse any site — data appears here live' },
                ].map(s => (
                  <div key={s.n} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                          style={{ background: 'linear-gradient(135deg, var(--purple), var(--blue))', color: 'white' }}>
                      {s.n}
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Extension Setup Banner — shown when no activity data ─────────────────────

function ExtensionBanner({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem('you2_banner_dismissed') === '1');
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dismiss = () => {
    sessionStorage.setItem('you2_banner_dismissed', '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="rounded-2xl p-4 mb-5 relative overflow-hidden slide-up"
         style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.06))', border: '1px solid rgba(139,92,246,0.2)' }}>
      {/* Dismiss */}
      <button onClick={dismiss} className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors hover:bg-[var(--surface2)]"
              style={{ color: 'var(--text-muted)' }}>✕</button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
             style={{ background: 'linear-gradient(135deg, var(--purple), var(--blue))' }}>🔌</div>
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>Connect the Chrome Extension to see live data</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            Paste your ID in the extension popup to start tracking visited sites.
          </p>

          {/* ID row */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl mb-3"
               style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
            <code className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>{userId}</code>
            <button onClick={copy}
                    className="shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105"
                    style={{
                      background: copied ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, var(--purple), var(--blue))',
                      color: copied ? 'var(--green)' : 'white',
                    }}>
              {copied ? '✓ Copied!' : 'Copy ID'}
            </button>
          </div>

          {/* Mini steps */}
          <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>① Open extension</span>
            <span style={{ color: 'var(--border-color)' }}>→</span>
            <span>② Paste ID</span>
            <span style={{ color: 'var(--border-color)' }}>→</span>
            <span>③ Browse sites</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentTabs, setRecentTabs] = useState<any[]>([]);
  const [actStats, setActStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const userId = localStorage.getItem('you2_user_id');
      if (!userId) { router.push('/create-twin'); return; }

      let userRes: any;
      try {
        userRes = await userAPI.getUser(userId);
      } catch (err: any) {
        // 404 = stale user ID in localStorage — clear it and redirect to onboarding
        if (err?.response?.status === 404) {
          localStorage.removeItem('you2_user_id');
          localStorage.removeItem('you2_user_name');
          router.push('/create-twin');
          return;
        }
        setError(true);
        return;
      }
      if (!userRes.success) { setError(true); return; }

      setUser(userRes.user);
      localStorage.setItem('you2_user_name', userRes.user.name);

      const [statsRes, recentRes] = await Promise.allSettled([
        activityAPI.getStats(userId, 30),
        activityAPI.getRecent(userId, 20),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.stats?.dailyBreakdown) {
        const data = Object.entries(statsRes.value.stats.dailyBreakdown).map(([date, d]: [string, any]) => ({
          date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          productive: d.productive || 0,
          distracting: d.distracting || 0,
        }));
        setChartData(data);
        setActStats(statsRes.value.stats);
      }

      if (recentRes.status === 'fulfilled') {
        setRecentTabs(recentRes.value.activities || []);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="min-h-screen bg-[var(--bg-primary)] pt-16"><DashboardSkeleton /></div>;
  if (error) return <div className="min-h-screen bg-[var(--bg-primary)] pt-32"><ErrorState onRetry={fetchData} message="Could not load your twin profile." /></div>;
  if (!user) return null;

  const userId = user.id;
  const score = user.productivityScore;
  const scoreColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--orange)' : 'var(--red)';

  const quickActions = [
    { href: '/chat', icon: '💬', label: 'Chat', color: 'var(--purple)' },
    { href: '/simulate', icon: '🔮', label: 'Simulate', color: 'var(--blue)' },
    { href: '/tasks', icon: '⚡', label: 'Tasks', color: 'var(--green)' },
    { href: '/insights', icon: '📊', label: 'Insights', color: 'var(--cyan)' },
  ];

  return (
    <div className="min-h-screen py-8 px-4 md:px-6 relative bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div className="relative w-full max-w-sm">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">🔍</span>
          <input type="text" placeholder="Search anything..."
            className="w-full bg-[var(--surface)] border border-[var(--border-color)] rounded-full py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--blue)] transition-colors" />
        </div>
        <div className="flex items-center gap-3">
          <button className="relative w-9 h-9 rounded-full flex items-center justify-center bg-[var(--surface)] border border-[var(--border-color)] hover:border-[var(--green)] transition-colors">
            🔔<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--red)] rounded-full border-2 border-[var(--bg-primary)]"></span>
          </button>
          <UserIdBadge id={String(user.id)} name={user.name} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── LEFT / MAIN COLUMN ─────────────────────────────────── */}
        <div className="flex-1 space-y-5 min-w-0">
          <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Overview</h1>

          {/* ── DAILY FORECAST CARD ── */}
          <DailyForecastCard userId={userId} />

          {/* ── EXTENSION SETUP BANNER (shown when no activity yet) ── */}
          {recentTabs.length === 0 && !actStats?.totalTime && (
            <ExtensionBanner userId={userId} />
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card p-4 rounded-2xl border hover:-translate-y-0.5 transition-transform duration-200" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-2">Productivity Score</p>
              <span className="text-2xl font-black" style={{ color: scoreColor }}>{score}</span>
              <span className="text-sm text-[var(--text-muted)]">/100</span>
              <p className="text-[11px] mt-2 font-medium" style={{ color: scoreColor }}>
                {score >= 70 ? '🔥 On fire!' : score >= 40 ? '📈 Growing' : '⚠️ Needs work'}
              </p>
            </div>

            {[
              { label: 'Active Goals', value: user.goals?.length || 0, icon: '🎯', color: 'var(--purple)' },
              { label: 'Interactions', value: user.historyCount || 0, icon: '💬', color: 'var(--blue)' },
              { label: 'Patterns Found', value: user.behaviorPatterns?.length || 0, icon: '🧬', color: 'var(--cyan)' },
            ].map((s, i) => (
              <div key={i} className="glass-card p-4 rounded-2xl border hover:-translate-y-0.5 transition-transform duration-200" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-2">{s.label}</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-black text-[var(--text-primary)]">{s.value}</span>
                  <span className="text-xl">{s.icon}</span>
                </div>
                <p className="text-[11px] mt-2 text-[var(--text-muted)]">Total to date</p>
              </div>
            ))}
          </div>

          {/* ── SMART ACTIVITY GRAPH ── */}
          <ActivityGraph
            activities={recentTabs}
            topSites={actStats?.topSites}
            stats={actStats ? {
              totalTime: actStats.totalTime || 0,
              productiveTime: actStats.productiveTime || 0,
              distractingTime: actStats.distractingTime || 0,
              productivityRatio: actStats.productivityRatio || 0,
            } : undefined}
          />

          {/* Activity Trend Chart */}
          <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Activity Trend <span className="text-[var(--text-muted)] font-normal text-xs">(30 days)</span></h2>
              <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--green)] inline-block"></span>Focus</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--red)] inline-block"></span>Distract</span>
              </div>
            </div>
            <div className="h-44">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--green)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--red)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: 12 }}
                             formatter={(v: any, n: any) => [fmtTime(v), n]} />
                    <Area type="monotone" dataKey="distracting" name="Distracting" stroke="var(--red)" strokeWidth={2} fill="url(#gDist)" />
                    <Area type="monotone" dataKey="productive" name="Productive" stroke="var(--green)" strokeWidth={2} fill="url(#gProd)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                  <span className="text-3xl">📡</span>
                  <p className="text-sm text-center">No data yet — install & run the Chrome Extension!</p>
                  <p className="text-xs">It tracks which sites you visit in real-time.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Browser Activity */}
          <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Recent Browser Activity</h2>
              <Link href="/insights" className="text-xs font-semibold hover:underline" style={{ color: 'var(--blue)' }}>See All →</Link>
            </div>

            {recentTabs.length > 0 ? (
              <div className="space-y-2">
                {recentTabs.map((act: any, i: number) => {
                  const distract = isDistracting(act.site);
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface2)] transition-colors group"
                         style={{ border: '1px solid var(--border-color)' }}>
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[var(--surface2)] shrink-0 flex items-center justify-center">
                        <img src={FAVICON(act.site)} alt="" className="w-5 h-5 object-contain"
                             onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {act.site.replace('www.', '')}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' · '}{new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {fmtTime(act.duration)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                            style={{ background: distract ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: distract ? 'var(--red)' : 'var(--green)' }}>
                        {distract ? 'distract' : 'focus'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center" style={{ color: 'var(--text-muted)' }}>
                <span className="text-3xl block mb-2">🌐</span>
                <p className="text-sm">No recent tabs tracked. Make sure the Extension is running!</p>
              </div>
            )}
          </div>

          {/* Behavior Patterns */}
          {user.behaviorPatterns && user.behaviorPatterns.length > 0 && (
            <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Identified Patterns</h2>
              <div className="space-y-2">
                {user.behaviorPatterns.slice(0, 4).map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--surface2)] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full shrink-0"
                           style={{ background: i % 2 === 0 ? 'var(--green)' : 'var(--red)' }}></div>
                      <span className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">{p.pattern}</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)] px-2 py-0.5 rounded-lg bg-[var(--surface2)]">×{p.frequency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ────────────────────────────────────── */}
        <div className="w-full lg:w-72 space-y-5">

          {/* Quick Actions */}
          <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Quick Actions</h2>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map((a, i) => (
                <Link key={i} href={a.href} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl border border-[var(--border-color)] bg-[var(--surface2)] group-hover:scale-105 transition-transform">
                    {a.icon}
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── VOICE TWIN ── */}
          <VoiceTwin userId={userId} userName={user.name} />

          {/* ── TWIN EVOLUTION ── */}
          <TwinEvolutionCard userId={userId} />

          {/* Activity Summary */}
          {actStats && (
            <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Screen Time Summary</h2>
              <div className="space-y-3">
                {[
                  { label: 'Total online', val: fmtTime(actStats.totalTime || 0), color: 'var(--text-primary)' },
                  { label: 'Focused', val: fmtTime(actStats.productiveTime || 0), color: 'var(--green)' },
                  { label: 'Distracted', val: fmtTime(actStats.distractingTime || 0), color: 'var(--red)' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
                    <span className="text-xs font-black" style={{ color: s.color }}>{s.val}</span>
                  </div>
                ))}
                {(actStats.totalTime || 0) > 0 && (
                  <div className="pt-2 border-t border-[var(--border-color)]">
                    <div className="flex justify-between text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      <span>Productivity ratio</span>
                      <span className="font-bold" style={{ color: 'var(--green)' }}>{actStats.productivityRatio ?? 0}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                           style={{ width: `${actStats.productivityRatio ?? 0}%`, background: 'linear-gradient(90deg, var(--green), var(--cyan))' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Goals */}
          <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Active Goals</h2>
            </div>
            <div className="space-y-3">
              {user.goals?.slice(0, 3).map((goal, i) => {
                const progress = Math.min(100, Math.floor(Math.random() * 50) + 30);
                return (
                  <div key={i} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface2)] hover:border-[var(--blue)] transition-colors">
                    <p className="text-xs font-semibold text-[var(--text-primary)] mb-2 leading-tight line-clamp-2">{goal}</p>
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>In Progress</span><span>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, background: i % 2 === 0 ? 'var(--blue)' : 'var(--purple)' }} />
                    </div>
                  </div>
                );
              })}
              {(!user.goals || user.goals.length === 0) && (
                <p className="text-xs text-[var(--text-muted)] py-2">No active goals yet.</p>
              )}
            </div>
          </div>

          {/* Active Habits */}
          <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Active Habits</h2>
            <div className="space-y-2">
              {user.habits?.slice(0, 3).map((habit, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border-color)]">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black" style={{ background: 'var(--blue)', color: '#fff' }}>#</div>
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate">{habit}</span>
                </div>
              ))}
              {(!user.habits || user.habits.length === 0) && (
                <p className="text-xs text-[var(--text-muted)] py-2">No habits configured yet.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
