'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { taskAPI, Task } from '@/lib/api';

const priorityConfig = {
  high: { label: 'High', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  low: { label: 'Low', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
};

const QUICK_REQUESTS = [
  "Plan my next 3 days for interview prep",
  "Create a weekly study schedule",
  "Plan a productive weekend",
  "Create a morning routine plan",
  "Break down my goals into daily tasks",
];

export default function TasksPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [rawPlan, setRawPlan] = useState('');
  const [showPlan, setShowPlan] = useState(false);

  const fetchTasks = useCallback(async (id: string) => {
    setLoading(true);
    try { const data = await taskAPI.getAll(id); setTasks(data.tasks || []); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('you2_user_id');
    if (!id) { router.push('/create-twin'); return; }
    setUserId(id); fetchTasks(id);
  }, [router, fetchTasks]);

  const generateTasks = async () => {
    if (!request.trim() || !userId || generating) return;
    setGenerating(true); setError('');
    try {
      const data = await taskAPI.generate(userId, request.trim());
      setRawPlan(data.rawResponse); setShowPlan(true);
      await fetchTasks(userId); setRequest('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate tasks. Check your Gemini API key.');
    } finally { setGenerating(false); }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try { await taskAPI.update(taskId, { completed: !completed }); setTasks(prev => prev.map(t => t._id === taskId ? { ...t, completed: !completed } : t)); }
    catch {}
  };

  const deleteTask = async (taskId: string) => {
    try { await taskAPI.delete(taskId); setTasks(prev => prev.filter(t => t._id !== taskId)); }
    catch {}
  };

  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);
  const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen py-8 px-4 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="blob w-72 h-72" style={{ background: '#10b981', top: '-60px', left: '-60px' }} />
      <div className="blob w-64 h-64" style={{ background: '#7c3aed', bottom: '-60px', right: '-60px' }} />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="mb-6 slide-up">
          <h1 className="text-4xl font-black gradient-text mb-1">⚡ Action Engine</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your twin generates personalized tasks based on your goals and habits</p>
        </div>

        {/* Stats */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Tasks', value: tasks.length, color: '#7c3aed' },
              { label: 'Completed', value: completed.length, color: '#10b981' },
              { label: 'Completion', value: `${completionRate}%`, color: '#3b82f6' },
            ].map((s, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 text-center card-hover">
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Generate */}
        <div className="glass-card rounded-3xl p-6 mb-6 card-hover">
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Generate New Plan</h2>
          <textarea value={request} onChange={e => setRequest(e.target.value)} rows={2}
            placeholder="What do you need a plan for?"
            className="tm-input resize-none" />

          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_REQUESTS.map((r, i) => (
              <button key={i} onClick={() => setRequest(r)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105"
                style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                {r}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-2xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={generateTasks} disabled={generating || !request.trim()}
            className="mt-4 w-full py-3 rounded-2xl font-bold text-white transition-all hover:scale-[1.01] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                ⚡ Generating your plan
                <span className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white typing-dot" style={{ animationDelay: `${i*0.2}s` }} />)}</span>
              </span>
            ) : 'Generate Action Plan →'}
          </button>
        </div>

        {/* AI Plan */}
        {showPlan && rawPlan && (
          <div className="glass-card rounded-3xl p-6 mb-6" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>⚡</div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Your Twin's Plan</h3>
              </div>
              <button onClick={() => setShowPlan(false)} className="text-xs transition-all hover:scale-110"
                style={{ color: 'var(--text-muted)' }}>✕ Hide</button>
            </div>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {rawPlan.replace(/TASKS_JSON:[\s\S]*$/, '').trim()}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Task List */}
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading tasks...</div>
        ) : (
          <div className="space-y-4">
            {pending.length > 0 && (
              <div className="glass-card rounded-3xl p-6">
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>📌 Pending ({pending.length})</h2>
                <div className="space-y-2">
                  {pending.map(task => <TaskCard key={task._id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div className="glass-card rounded-3xl p-6">
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-muted)' }}>✅ Completed ({completed.length})</h2>
                <div className="space-y-2">
                  {completed.map(task => <TaskCard key={task._id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)}
                </div>
              </div>
            )}
            {tasks.length === 0 && !loading && (
              <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                <div className="text-5xl mb-3 float-anim">⚡</div>
                <p className="text-lg font-medium">No tasks yet</p>
                <p className="text-sm mt-1">Generate your first action plan above</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string, c: boolean) => void; onDelete: (id: string) => void }) {
  const cfg = priorityConfig[task.priority];
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl transition-all hover:scale-[1.01]"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border-color)', opacity: task.completed ? 0.6 : 1 }}>
      <button onClick={() => onToggle(task._id, task.completed)}
        className="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all hover:scale-110"
        style={task.completed ? { background: '#10b981', borderColor: '#10b981', color: 'white' } : { borderColor: 'var(--text-muted)' }}>
        {task.completed && <span className="text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${task.completed ? 'line-through' : ''}`}
            style={{ color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
            {task.title}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
            {cfg.label}
          </span>
          {task.timeEstimate && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⏱ {task.timeEstimate}</span>}
        </div>
        {task.description && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>}
      </div>
      <button onClick={() => onDelete(task._id)} className="transition-colors hover:scale-110 text-sm flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}>✕</button>
    </div>
  );
}
