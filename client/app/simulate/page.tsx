'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { simulationAPI } from '@/lib/api';
import { SkeletonBox } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';

interface ParsedSim {
  best_case?: string;
  likely_case?: string;
  worst_case?: string;
  confidence_score?: number;
  reasoning?: string;
  // Legacy fallback
  bestCase?: string;
  likelyCase?: string;
  worstCase?: string;
  advice?: string;
}

interface SimResult {
  scenario: string;
  parsed: ParsedSim | null;
  rawResponse: string;
  timestamp: string;
}

const EXAMPLES = [
  "What if I skip studying for 1 week?",
  "What if I study 4 hours every day for a month?",
  "What if I keep procrastinating for another month?",
  "What if I wake up at 6am every day for 30 days?",
  "What if I quit social media for 2 weeks?",
];

export default function SimulatePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<SimResult[]>([]);

  useEffect(() => {
    const id = localStorage.getItem('you2_user_id');
    if (!id) { router.push('/create-twin'); return; }
    setUserId(id);
    const saved = localStorage.getItem(`you2_sims_${id}`);
    if (saved) { try { setHistory(JSON.parse(saved)); } catch {} }
  }, [router]);

  const runSimulation = async () => {
    if (!scenario.trim() || !userId || loading) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await simulationAPI.run(userId, scenario.trim());
      const sim: SimResult = {
        scenario: data.scenario,
        parsed: data.parsed || null,
        rawResponse: data.rawResponse,
        timestamp: data.timestamp,
      };
      setResult(sim);
      const updated = [sim, ...history].slice(0, 10);
      setHistory(updated);
      localStorage.setItem(`you2_sims_${userId}`, JSON.stringify(updated));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Simulation failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to resolve both old and new field formats
  const getFields = (p: ParsedSim) => ({
    best: p.best_case || p.bestCase || '',
    likely: p.likely_case || p.likelyCase || '',
    worst: p.worst_case || p.worstCase || '',
    confidence: p.confidence_score,
    reasoning: p.reasoning || p.advice || '',
  });

  return (
    <div className="min-h-screen py-8 px-4 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Background orbs */}
      <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'var(--blue)' }} />
      <div className="absolute bottom-[-80px] left-[-80px] w-80 h-80 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'var(--purple)' }} />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="mb-8 slide-up">
          <h1 className="text-4xl font-black gradient-text mb-1">🔮 Simulation Engine</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your twin predicts what happens based on your real habits and goals
          </p>
        </div>

        {/* Input Card */}
        <div className="glass-card rounded-3xl p-6 mb-6">
          <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Describe your scenario
          </label>
          <textarea
            value={scenario}
            onChange={e => setScenario(e.target.value)}
            rows={3}
            placeholder="e.g. What if I skip studying for 1 week?"
            className="tm-input resize-none"
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) runSimulation(); }}
          />

          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLES.map((s, i) => (
              <button key={i} onClick={() => setScenario(s)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105"
                style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                {s}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-2xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠️ {error}
              <button onClick={runSimulation} className="ml-auto underline text-xs">Retry</button>
            </div>
          )}

          <button
            onClick={runSimulation}
            disabled={loading || !scenario.trim()}
            className="mt-4 w-full py-3.5 rounded-2xl font-bold text-white transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                🔮 Simulating your future
                <span className="flex gap-1">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-white typing-dot" style={{ animationDelay: `${i*0.2}s` }} />
                  ))}
                </span>
              </span>
            ) : 'Run Simulation →'}
          </button>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SkeletonBox className="h-40" />
              <SkeletonBox className="h-40" />
              <SkeletonBox className="h-40" />
            </div>
            <SkeletonBox className="h-24" />
          </div>
        )}

        {/* Simulation Result Cards */}
        {result && !loading && (
          <div className="space-y-4 mb-8 slide-up">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Simulation Result</h2>
              <span className="px-3 py-1 rounded-full text-xs font-semibold truncate max-w-xs"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                "{result.scenario}"
              </span>
            </div>

            {result.parsed ? (() => {
              const f = getFields(result.parsed!);
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Best Case */}
                  <div className="p-5 rounded-2xl border bg-[var(--surface2)] slide-up group hover:-translate-y-1 transition-transform duration-300"
                       style={{ borderColor: 'rgba(16,185,129,0.3)', animationDelay: '0.05s' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--green)' }}></span>
                      <h4 className="text-sm font-black" style={{ color: 'var(--green)' }}>Best Case</h4>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{f.best || '—'}</p>
                  </div>

                  {/* Likely Case */}
                  <div className="p-5 rounded-2xl border bg-[var(--surface2)] slide-up group hover:-translate-y-1 transition-transform duration-300"
                       style={{ borderColor: 'rgba(6,182,212,0.3)', animationDelay: '0.15s' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--cyan)' }}></span>
                      <h4 className="text-sm font-black" style={{ color: 'var(--cyan)' }}>Likely Case</h4>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{f.likely || '—'}</p>
                  </div>

                  {/* Worst Case */}
                  <div className="p-5 rounded-2xl border bg-[var(--surface2)] slide-up group hover:-translate-y-1 transition-transform duration-300"
                       style={{ borderColor: 'rgba(239,68,68,0.3)', animationDelay: '0.25s' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--red)' }}></span>
                      <h4 className="text-sm font-black" style={{ color: 'var(--red)' }}>Worst Case</h4>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{f.worst || '—'}</p>
                  </div>

                  {/* Confidence + Reasoning Footer */}
                  <div className="md:col-span-3 p-5 rounded-2xl flex items-center gap-5 border slide-up"
                       style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', animationDelay: '0.35s' }}>
                    <div className="relative w-16 h-16 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--blue)" strokeWidth="3"
                          strokeDasharray={`${(f.confidence || 0) / 100 * 94} 94`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-black" style={{ color: 'var(--blue)' }}>
                          {f.confidence ?? '?'}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>AI Reasoning Engine</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {f.reasoning || 'Based on your tracked behavioral patterns and productivity score.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="glass-card rounded-3xl p-6 border" style={{ borderColor: 'rgba(124,58,237,0.2)' }}>
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.rawResponse}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Past Simulations */}
        {history.length > 0 && (
          <div className="glass-card rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Past Simulations</h2>
            <div className="space-y-2">
              {history.map((h, i) => (
                <button key={i} onClick={() => setResult(h)}
                  className="w-full text-left p-3 rounded-2xl transition-all hover:scale-[1.01] hover:bg-[var(--surface2)]"
                  style={{ border: '1px solid var(--border-color)' }}>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>🔮 {h.scenario}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(h.timestamp).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
