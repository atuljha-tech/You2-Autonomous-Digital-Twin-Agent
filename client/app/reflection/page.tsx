'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatAPI } from '@/lib/api';

interface Message {
  role: 'user' | 'twin';
  content: string;
  timestamp: string;
}

const config = {
  label: '🧠 Reflection', 
  gradient: 'linear-gradient(135deg, var(--green), var(--cyan))',
  light: 'rgba(16, 185, 129, 0.08)', 
  border: 'rgba(16, 185, 129, 0.2)', 
  color: 'var(--green)',
  placeholder: 'e.g. "Why do I keep procrastinating on my goals?"',
  starters: ['Why do I keep procrastinating?', "What are my biggest weaknesses?", "Why can't I stay consistent?", 'Analyze my behavior patterns'],
};

export default function ReflectionPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = localStorage.getItem('you2_user_id') || localStorage.getItem('you2_user_id');
    if (!id) { router.push('/create-twin'); return; }
    setUserId(id);
    const saved = localStorage.getItem(`you2_reflection_${id}`);
    if (saved) { try { setMessages(JSON.parse(saved)); } catch {} }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const saveMessages = (msgs: Message[]) => {
    if (userId) localStorage.setItem(`you2_reflection_${userId}`, JSON.stringify(msgs.slice(-60)));
  };

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || !userId || loading) return;
    const userMsg: Message = { role: 'user', content, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const data = await chatAPI.send(userId, content, 'reflection');
      const twinMsg: Message = { role: 'twin', content: data.response, timestamp: data.timestamp };
      const updated = [...newMessages, twinMsg];
      setMessages(updated);
      saveMessages(updated);
    } catch (err: any) {
      const errMsg: Message = {
        role: 'twin',
        content: `⚠️ **Error:** ${err.response?.data?.error || 'Failed to get response.'}`,
        timestamp: new Date().toISOString(),
      };
      const updated = [...newMessages, errMsg];
      setMessages(updated);
      saveMessages(updated);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col py-6">
      
      {/* Header */}
      <div className="mb-6 slide-up">
        <h1 className="text-3xl font-black gradient-text">Deep Reflection 🧠</h1>
        <p className="text-sm mt-1 text-[var(--text-secondary)]">
          Explore your behavioral patterns. You² analyzes your actions to give profound insights.
        </p>
      </div>

      {/* Chat Window */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden w-full h-[600px] border border-[var(--border-color)]">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center fade-in">
              <div className="text-5xl mb-4 float-anim opacity-80" style={{ filter: 'grayscale(1)' }}>🔎</div>
              <p className="font-bold text-lg text-[var(--text-primary)]">Analyze Your Actions</p>
              <p className="text-sm mt-1 mb-6 text-[var(--text-muted)]">Select a prompt below to start reflecting:</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {config.starters.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    className="text-xs px-4 py-2 rounded-xl font-semibold transition-all hover:scale-105 border border-[var(--border-color)] bg-[var(--surface2)] text-[var(--text-primary)]">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} slide-up`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'ml-auto' : 'mr-auto w-full'}`}>
                {msg.role === 'twin' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                      style={{ background: config.gradient }}>🧠</div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">You² Analysis</span>
                  </div>
                )}
                
                {msg.role === 'user' ? (
                  <div className="px-5 py-3.5 rounded-2xl rounded-tr-sm text-sm"
                    style={{ background: config.gradient, color: '#ffffff' }}>
                    {msg.content}
                  </div>
                ) : (
                  <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-[var(--surface)] border border-[var(--border-color)]">
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
                <div className={`text-[10px] mt-1.5 px-1 text-[var(--text-muted)] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start slide-up">
              <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-[var(--surface)] border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                   <span className="text-sm text-[var(--text-muted)]">Analyzing patterns...</span>
                   <div className="flex gap-1">
                     {[0, 1, 2].map(i => (
                       <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] typing-dot" />
                     ))}
                   </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-[var(--surface2)] border-t border-[var(--border-color)]">
          <div className="flex gap-3 max-w-5xl mx-auto">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={config.placeholder}
              rows={2}
              className="flex-1 tm-input resize-none h-14"
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="px-6 rounded-xl text-white font-bold transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: config.gradient }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
