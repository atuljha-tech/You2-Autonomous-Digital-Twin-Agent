import React from 'react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message = "Something went wrong while connecting to your Twin.", onRetry }: ErrorStateProps) => (
  <div className="flex flex-col items-center justify-center p-8 bg-[var(--surface2)] rounded-3xl border border-[var(--red)] border-opacity-30 slide-up w-full max-w-lg mx-auto my-12">
    <div className="w-16 h-16 rounded-full bg-[var(--red)] bg-opacity-10 text-[var(--red)] flex items-center justify-center text-2xl mb-4">
       ⚠️
    </div>
    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Connection Interrupted</h3>
    <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
       {message}
    </p>
    {onRetry && (
      <button 
        onClick={onRetry} 
        className="px-6 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold hover:border-[var(--text-primary)] transition-colors shadow-sm"
      >
        Retry Request
      </button>
    )}
  </div>
);
