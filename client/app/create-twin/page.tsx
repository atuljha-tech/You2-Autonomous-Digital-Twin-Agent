'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface FormData {
  name: string; age: string; occupation: string;
  primaryGoal: string; secondaryGoals: string; timeline: string; biggestObstacle: string;
  morningRoutine: string; eveningHabits: string; procrastinationTriggers: string; distractions: string;
  workStyle: string; productivityPeaks: string; focusDuration: string; learningStyle: string;
  strengths: string; weaknesses: string; motivationType: string; stressResponse: string;
}

const STEPS = [
  { num: 1, label: 'Identity',    icon: '👤', color: '#8b5cf6' },
  { num: 2, label: 'Goals',       icon: '🎯', color: '#3b82f6' },
  { num: 3, label: 'Habits',      icon: '🔄', color: '#f59e0b' },
  { num: 4, label: 'Work Style',  icon: '💼', color: '#10b981' },
  { num: 5, label: 'Personality', icon: '🧬', color: '#ec4899' },
];

// ── Reusable field components ──────────────────────────────────────────────────

function Field({ label, name, value, onChange, placeholder, type = 'text', hint, required = false }: {
  label: string; name: string; value: string; onChange: (e: any) => void;
  placeholder: string; type?: string; hint?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        {label}{required && <span className="ml-1" style={{ color: '#ef4444' }}>*</span>}
      </label>
      {hint && <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      {type === 'textarea'
        ? <textarea name={name} value={value} onChange={onChange} rows={3}
            placeholder={placeholder} required={required} className="tm-input resize-none" />
        : <input type="text" name={name} value={value} onChange={onChange}
            placeholder={placeholder} required={required} className="tm-input" />
      }
    </div>
  );
}

function Chips({ label, name, value, onChange, options, hint }: {
  label: string; name: string; value: string; onChange: (e: any) => void;
  options: string[]; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</label>
      {hint && <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button"
            onClick={() => onChange({ target: { name, value: opt } })}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={value === opt
              ? { background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: 'white', border: '1px solid transparent', boxShadow: '0 4px 12px rgba(139,92,246,0.35)' }
              : { background: 'var(--surface2)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CreateTwin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: '', age: '', occupation: '',
    primaryGoal: '', secondaryGoals: '', timeline: '', biggestObstacle: '',
    morningRoutine: '', eveningHabits: '', procrastinationTriggers: '', distractions: '',
    workStyle: '', productivityPeaks: '', focusDuration: '', learningStyle: '',
    strengths: '', weaknesses: '', motivationType: '', stressResponse: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const canProceed = () => {
    if (step === 1) return form.name.trim().length > 0 && form.occupation.trim().length > 0;
    if (step === 2) return form.primaryGoal.trim().length > 0;
    if (step === 3) return form.distractions.trim().length > 0;
    if (step === 4) return form.workStyle.trim().length > 0;
    if (step === 5) return form.strengths.trim().length > 0 && form.weaknesses.trim().length > 0;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceed()) return;
    setLoading(true); setError('');
    try {
      const goals = [
        form.primaryGoal,
        ...form.secondaryGoals.split(',').map(g => g.trim()).filter(Boolean),
      ].filter(Boolean);

      const habits = [
        form.morningRoutine      && `Morning: ${form.morningRoutine}`,
        form.eveningHabits       && `Evening: ${form.eveningHabits}`,
        form.procrastinationTriggers && `Procrastination triggers: ${form.procrastinationTriggers}`,
        form.learningStyle       && `Learning style: ${form.learningStyle}`,
      ].filter(Boolean) as string[];

      const payload = {
        name: form.name,
        goals,
        habits,
        preferences: {
          workStyle: form.workStyle,
          productivityPeaks: form.productivityPeaks.split(',').map(p => p.trim()).filter(Boolean),
          distractions: form.distractions.split(',').map(d => d.trim()).filter(Boolean),
        },
        personality: {
          traits: [form.motivationType, form.learningStyle].filter(Boolean),
          strengths: form.strengths.split(',').map(s => s.trim()).filter(Boolean),
          weaknesses: form.weaknesses.split(',').map(w => w.trim()).filter(Boolean),
        },
        extraContext: {
          age: form.age,
          occupation: form.occupation,
          timeline: form.timeline,
          biggestObstacle: form.biggestObstacle,
          focusDuration: form.focusDuration,
          stressResponse: form.stressResponse,
        },
      };

      const res = await api.post('/create-user', payload);
      if (res.data.success) {
        localStorage.setItem('you2_user_id', res.data.user.id);
        localStorage.setItem('you2_user_name', res.data.user.name);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create twin. Make sure the server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const cur = STEPS[step - 1];

  return (
    <div className="min-h-screen py-10 px-4 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Background blobs */}
      <div className="blob w-72 h-72" style={{ background: '#8b5cf6', top: '-60px', right: '-60px' }} />
      <div className="blob w-64 h-64" style={{ background: '#3b82f6', bottom: '-60px', left: '-60px' }} />

      <div className="relative z-10 max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 slide-up">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 float-anim"
            style={{ background: `linear-gradient(135deg, ${cur.color}, #6366f1)`, boxShadow: `0 10px 30px ${cur.color}50` }}>
            {cur.icon}
          </div>
          <h1 className="text-4xl font-black gradient-text mb-1">Create Your Digital Twin</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>The more you share, the smarter your twin becomes</p>
        </div>

        {/* Step Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => step > s.num && setStep(s.num)}
                  className="flex flex-col items-center gap-1 shrink-0"
                  style={{ cursor: step > s.num ? 'pointer' : 'default' }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-all"
                    style={step === s.num
                      ? { background: `linear-gradient(135deg, ${s.color}, #6366f1)`, boxShadow: `0 4px 15px ${s.color}50`, color: 'white' }
                      : step > s.num
                        ? { background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981', color: '#10b981' }
                        : { background: 'var(--surface2)', border: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    {step > s.num ? '✓' : s.icon}
                  </div>
                  <span className="text-xs font-semibold hidden sm:block"
                    style={{ color: step === s.num ? s.color : step > s.num ? '#10b981' : 'var(--text-muted)' }}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-1 mx-2 rounded-full transition-all"
                    style={{ background: step > s.num ? 'linear-gradient(90deg,#10b981,#3b82f6)' : 'var(--border-color)' }} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Step {step} of {STEPS.length} — {cur.label}
          </p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8">

          {error && (
            <div className="mb-5 p-4 rounded-2xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── Step 1: Identity ── */}
          {step === 1 && (
            <div className="space-y-5 bounce-in">
              <div>
                <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Who are you? 👤</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Let's start with the basics so your twin knows you</p>
              </div>
              <Field label="Your Full Name" name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Alex Kumar" required />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Your Age" name="age" value={form.age} onChange={handleChange} placeholder="e.g. 22" />
                <Field label="Occupation / Field" name="occupation" value={form.occupation} onChange={handleChange}
                  placeholder="e.g. CS Student" required />
              </div>
              <Chips label="What best describes you?" name="occupation" value={form.occupation} onChange={handleChange}
                hint="Pick the closest match"
                options={['Student', 'Developer', 'Designer', 'Entrepreneur', 'Job Seeker', 'Researcher', 'Other']} />
            </div>
          )}

          {/* ── Step 2: Goals ── */}
          {step === 2 && (
            <div className="space-y-5 bounce-in">
              <div>
                <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>What do you want? 🎯</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Be specific — vague goals create a vague twin</p>
              </div>
              <Field label="Your #1 Primary Goal" name="primaryGoal" value={form.primaryGoal} onChange={handleChange}
                type="textarea" required
                placeholder="e.g. Get a job at Google as a Software Engineer by December 2025"
                hint="Be as specific as possible — include the outcome and timeline" />
              <Field label="Other Goals (optional)" name="secondaryGoals" value={form.secondaryGoals} onChange={handleChange}
                type="textarea"
                placeholder="e.g. Build a side project, Learn system design, Improve DSA skills"
                hint="Comma-separated. These are secondary but still important." />
              <Chips label="Timeline for your primary goal?" name="timeline" value={form.timeline} onChange={handleChange}
                options={['1 month', '3 months', '6 months', '1 year', '2+ years']} />
              <Field label="Your biggest obstacle right now?" name="biggestObstacle" value={form.biggestObstacle} onChange={handleChange}
                type="textarea"
                placeholder="e.g. I keep procrastinating, I don't have a structured plan"
                hint="Your twin will specifically help you overcome this" />
            </div>
          )}

          {/* ── Step 3: Habits ── */}
          {step === 3 && (
            <div className="space-y-5 bounce-in">
              <div>
                <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Your daily patterns 🔄</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Honest answers = accurate twin. No judgment here.</p>
              </div>
              <Field label="Describe your typical morning" name="morningRoutine" value={form.morningRoutine} onChange={handleChange}
                type="textarea"
                placeholder="e.g. Wake up at 10am, scroll phone for 30 mins, skip breakfast, start work at 11"
                hint="What actually happens, not what you wish happened" />
              <Field label="What do you usually do in the evenings?" name="eveningHabits" value={form.eveningHabits} onChange={handleChange}
                type="textarea"
                placeholder="e.g. Watch YouTube for 2-3 hours, then feel guilty and try to study late night" />
              <Field label="What triggers your procrastination?" name="procrastinationTriggers" value={form.procrastinationTriggers} onChange={handleChange}
                type="textarea"
                placeholder="e.g. Hard tasks, boredom, anxiety about failing, social media notifications"
                hint="This is critical for your twin to intervene at the right moment" />
              <Field label="Your biggest distractions" name="distractions" value={form.distractions} onChange={handleChange}
                placeholder="e.g. YouTube, Instagram, Gaming, Netflix, WhatsApp"
                hint="Comma-separated. The extension will track these." required />
            </div>
          )}

          {/* ── Step 4: Work Style ── */}
          {step === 4 && (
            <div className="space-y-5 bounce-in">
              <div>
                <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>How you work best 💼</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Your twin will plan around your natural rhythm</p>
              </div>
              <Chips label="Your work style" name="workStyle" value={form.workStyle} onChange={handleChange}
                hint="How do you prefer to work?"
                options={['Deep work (long sessions)', 'Pomodoro (25/5 min)', 'Sprint & rest', 'Flexible/random', 'Deadline-driven']} />
              <Field label="When are you most productive?" name="productivityPeaks" value={form.productivityPeaks} onChange={handleChange}
                placeholder="e.g. Morning 9-11am, Late night 11pm-2am"
                hint="Comma-separated time windows" />
              <Chips label="How long can you focus before a break?" name="focusDuration" value={form.focusDuration} onChange={handleChange}
                options={['15-20 mins', '25-30 mins', '45-60 mins', '90+ mins', 'Varies a lot']} />
              <Chips label="How do you learn best?" name="learningStyle" value={form.learningStyle} onChange={handleChange}
                options={['Watching videos', 'Reading docs', 'Building projects', 'Solving problems', 'Teaching others']} />
            </div>
          )}

          {/* ── Step 5: Personality ── */}
          {step === 5 && (
            <div className="space-y-5 bounce-in">
              <div>
                <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Your personality 🧬</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>The final layer — this makes your twin truly YOU</p>
              </div>
              <Field label="Your top strengths" name="strengths" value={form.strengths} onChange={handleChange}
                type="textarea" required
                placeholder="e.g. Strong problem solver, Quick learner, Good at coding, Creative"
                hint="Comma-separated. Be honest — these are real strengths." />
              <Field label="Your honest weaknesses" name="weaknesses" value={form.weaknesses} onChange={handleChange}
                type="textarea" required
                placeholder="e.g. Procrastination, Perfectionism, Inconsistency, Overthinking"
                hint="Comma-separated. Your twin will help you work around these." />
              <Chips label="What motivates you most?" name="motivationType" value={form.motivationType} onChange={handleChange}
                options={['Fear of failure', 'Desire for success', 'Competition', 'Passion/interest', 'External rewards', 'Helping others']} />
              <Chips label="How do you respond to stress?" name="stressResponse" value={form.stressResponse} onChange={handleChange}
                options={['Freeze & avoid', 'Work harder', 'Seek distraction', 'Talk to someone', 'Exercise/walk', 'Sleep it off']} />

              {/* Live preview */}
              {(form.name || form.primaryGoal) && (
                <div className="p-4 rounded-2xl slide-up"
                  style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#a855f7' }}>🧠 Twin Preview</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{form.name || 'Your twin'}</strong>
                    {form.age && `, ${form.age}`}
                    {form.occupation && ` — ${form.occupation}`}.
                    {form.primaryGoal && <> Mission: <em>{form.primaryGoal.slice(0, 80)}{form.primaryGoal.length > 80 ? '…' : ''}</em>.</>}
                    {form.workStyle && <> Works best with {form.workStyle.toLowerCase()}.</>}
                    {form.motivationType && <> Driven by {form.motivationType.toLowerCase()}.</>}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-2xl font-bold transition-all hover:scale-[1.02]"
                style={{ background: 'var(--surface2)', color: '#8b5cf6', border: '2px solid rgba(139,92,246,0.25)' }}>
                ← Back
              </button>
            )}
            {step < STEPS.length ? (
              <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="flex-1 py-3 rounded-2xl font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${cur.color}, #6366f1)`, boxShadow: `0 4px 15px ${cur.color}40` }}>
                Next: {STEPS[step].label} →
              </button>
            ) : (
              <button type="submit" disabled={loading || !canProceed()}
                className="flex-1 py-3 rounded-2xl font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
                {loading ? '🧠 Creating Your Twin...' : '🚀 Create My Digital Twin'}
              </button>
            )}
          </div>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          {step < STEPS.length
            ? `${STEPS.length - step} more step${STEPS.length - step > 1 ? 's' : ''} to go`
            : 'Last step! Your twin is almost ready 🎉'}
        </p>
      </div>
    </div>
  );
}
