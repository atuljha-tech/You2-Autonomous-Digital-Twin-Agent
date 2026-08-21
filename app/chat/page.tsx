'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatAPI } from '@/lib/api';

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export default function ChatPage() {
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
    const saved = localStorage.getItem(`you2_generic_chat_${id}`);
    if (saved) { try { setMessages(JSON.parse(saved)); } catch {} }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const saveMessages = (msgs: Message[]) => {
    if (userId) localStorage.setItem(`you2_generic_chat_${userId}`, JSON.stringify(msgs.slice(-60)));
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
      // Reusing the you2 chatAPI under 'reflection' logic to just act as a standard chat proxy.
      const data = await chatAPI.send(userId, content, 'reflection');
      const aiMsg: Message = { role: 'ai', content: data.response, timestamp: data.timestamp };
      const updated = [...newMessages, aiMsg];
      setMessages(updated);
      saveMessages(updated);
    } catch (err: any) {
      const errMsg: Message = {
        role: 'ai',
        content: `⚠️ **Error:** ${err.response?.data?.error || 'Failed to get response. Please check connection.'}`,
        timestamp: new Date().toISOString(),
      };
      const updated = [...newMessages, errMsg];
      setMessages(updated);
      saveMessages(updated);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Dynamic Main Chat Area */}
      <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-4 py-8 space-y-8 scroll-smooth">
        
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center fade-in">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-xl bg-black overflow-hidden relative">
              <img src="/logo.png" alt="You² Logo" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML += '<span class="text-white font-bold text-2xl">Y²</span>'; }} />
            </div>
            <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">How can I help you?</h1>
            <p className="text-sm text-[var(--text-muted)] max-w-md">
               I am You², your personal AI assistant. Ask me anything, or have a general conversation.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} slide-up`}>
            {msg.role === 'ai' && (
               <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white mr-4 shadow-sm flex-shrink-0 mt-1 bg-black overflow-hidden relative">
                 <img src="/logo.png" alt="You²" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML += 'Y²'; }} />
               </div>
            )}
            
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'bg-[var(--surface2)] text-[var(--text-primary)] px-5 py-3 rounded-2xl rounded-tr-sm border border-[var(--border-color)]' : 'bg-transparent text-[var(--text-primary)]'}`}>
              <div className="markdown-body">
                 {msg.role === 'user' ? (
                   <p className="m-0 leading-relaxed text-sm font-medium">{msg.content}</p>
                 ) : (
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                 )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex w-full justify-start slide-up">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white mr-4 shadow-sm flex-shrink-0 mt-1 bg-black overflow-hidden relative">
              <img src="/logo.png" alt="You²" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML += 'Y²'; }} />
            </div>
            <div className="flex items-center gap-1.5 pt-3">
               {[0, 1, 2].map(i => (
                 <div key={i} className="w-2 h-2 rounded-full bg-[var(--text-muted)] typing-dot" />
               ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Anchored Bottom */}
      <div className="w-full max-w-4xl mx-auto px-4 pb-6 pt-2 bg-[var(--bg-primary)]">
        <div className="relative group">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message You²..."
            rows={1}
            style={{ minHeight: '56px', maxHeight: '200px' }}
            className="w-full bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-2xl py-4 pl-5 pr-14 outline-none focus:border-[var(--blue)] transition-colors resize-none shadow-sm shadow-[var(--border-color)]"
          />
          <button 
            onClick={() => sendMessage()} 
            disabled={loading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 enabled:hover:scale-105"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
            ↑
          </button>
        </div>
        <div className="text-center mt-3">
           <span className="text-[10px] text-[var(--text-muted)]">You² can make mistakes. Consider verifying important information.</span>
        </div>
      </div>
    </div>
  );
}
