'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatAPI } from '@/lib/api';

interface VoiceTwinProps {
  userId: string;
  userName: string;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// Extend Window for webkit speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceTwin({ userId, userName }: VoiceTwinProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
    synthRef.current = window.speechSynthesis;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const current = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setTranscript(current);
    };

    recognition.onend = () => {
      // Only process if we were actively listening (not manually stopped)
      setVoiceState(prev => {
        if (prev === 'listening') return 'processing';
        return prev;
      });
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        setError(`Mic error: ${event.error}`);
        setVoiceState('idle');
      }
    };

    recognitionRef.current = recognition;
  }, []);

  // When state transitions to 'processing', fire the API call
  useEffect(() => {
    if (voiceState === 'processing' && transcript.trim()) {
      handleSendVoice(transcript.trim());
    } else if (voiceState === 'processing' && !transcript.trim()) {
      setVoiceState('idle');
    }
  }, [voiceState]);

  const handleSendVoice = async (text: string) => {
    setError('');
    try {
      const data = await chatAPI.send(userId, text, 'reflection');
      const reply = data.response;
      // Strip markdown for TTS
      const plainText = reply
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`[^`]*`/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n+/g, ' ')
        .trim();

      setResponse(reply);
      setVoiceState('speaking');
      speakText(plainText);
    } catch {
      setError('Failed to get response. Check your connection.');
      setVoiceState('idle');
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick a natural voice if available
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setVoiceState('idle');
    utterance.onerror = () => setVoiceState('idle');

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const startListening = useCallback(() => {
    if (!recognitionRef.current || voiceState !== 'idle') return;
    setTranscript('');
    setResponse('');
    setError('');
    setVoiceState('listening');
    try {
      recognitionRef.current.start();
    } catch {
      setVoiceState('idle');
    }
  }, [voiceState]);

  const stopListening = useCallback(() => {
    if (voiceState === 'listening') {
      recognitionRef.current?.stop();
      // onend will fire and transition to 'processing'
    } else if (voiceState === 'speaking') {
      synthRef.current?.cancel();
      setVoiceState('idle');
    }
  }, [voiceState]);

  if (!isSupported) {
    return (
      <div className="glass-card p-5 rounded-2xl border text-center" style={{ borderColor: 'var(--border-color)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          🎙️ Voice mode requires Chrome or Edge browser.
        </p>
      </div>
    );
  }

  const stateConfig = {
    idle: {
      label: 'Talk to Twin',
      sublabel: `Ask ${userName}'s twin anything`,
      ringColor: 'var(--purple)',
      pulseClass: '',
      icon: '🎙️',
    },
    listening: {
      label: 'Listening...',
      sublabel: 'Speak now — tap to stop',
      ringColor: 'var(--green)',
      pulseClass: 'animate-pulse',
      icon: '🔴',
    },
    processing: {
      label: 'Thinking...',
      sublabel: 'Your twin is processing',
      ringColor: 'var(--blue)',
      pulseClass: 'animate-spin',
      icon: '⚡',
    },
    speaking: {
      label: 'Speaking',
      sublabel: 'Tap to stop',
      ringColor: 'var(--cyan)',
      pulseClass: 'animate-pulse',
      icon: '🔊',
    },
  };

  const cfg = stateConfig[voiceState];

  return (
    <div className="glass-card p-5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>🎙️ Voice Twin</h2>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Talk directly with your AI twin</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full font-bold"
          style={{
            background: voiceState === 'idle' ? 'var(--surface2)' : 'rgba(16,185,129,0.1)',
            color: voiceState === 'idle' ? 'var(--text-muted)' : 'var(--green)',
          }}>
          {voiceState === 'idle' ? 'Ready' : voiceState.charAt(0).toUpperCase() + voiceState.slice(1)}
        </span>
      </div>

      {/* Orb Button */}
      <div className="flex flex-col items-center py-4">
        <button
          onClick={voiceState === 'idle' ? startListening : stopListening}
          disabled={voiceState === 'processing'}
          className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${cfg.ringColor}33, ${cfg.ringColor}11)`,
            border: `2px solid ${cfg.ringColor}`,
            boxShadow: voiceState !== 'idle' ? `0 0 30px ${cfg.ringColor}44` : 'none',
          }}
        >
          {/* Outer pulse ring */}
          {(voiceState === 'listening' || voiceState === 'speaking') && (
            <span className="absolute inset-[-8px] rounded-full border-2 animate-ping opacity-30"
              style={{ borderColor: cfg.ringColor }} />
          )}
          <span className="text-3xl">{cfg.icon}</span>
        </button>

        <p className="text-sm font-bold mt-3" style={{ color: 'var(--text-primary)' }}>{cfg.label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{cfg.sublabel}</p>
      </div>

      {/* Live transcript */}
      {transcript && (
        <div className="mt-3 p-3 rounded-xl text-sm italic"
          style={{ background: 'var(--surface2)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
          <span className="text-[10px] font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>YOU SAID</span>
          "{transcript}"
        </div>
      )}

      {/* AI Response */}
      {response && voiceState !== 'processing' && (
        <div className="mt-3 p-4 rounded-xl"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border-color)' }}>
          <span className="text-[10px] font-bold block mb-2" style={{ color: 'var(--cyan)' }}>TWIN RESPONSE</span>
          <div className="markdown-body text-xs leading-relaxed max-h-32 overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-center" style={{ color: 'var(--red)' }}>⚠️ {error}</p>
      )}
    </div>
  );
}
