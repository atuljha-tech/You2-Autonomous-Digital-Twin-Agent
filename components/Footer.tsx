'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t mt-auto w-full transition-colors" 
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg transition-transform group-hover:scale-105 bg-black overflow-hidden relative">
                <img src="/logo.png" alt="You²" className="w-full h-full object-cover relative z-10" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML += '<span class="text-white font-black text-xs relative z-10">Y²</span>'; }} />
              </div>
              <span className="text-sm font-black tracking-tight text-[var(--text-primary)]">You Square</span>
            </Link>
            <div className="hidden md:block w-1 h-1 rounded-full bg-[var(--text-muted)]"></div>
            <span className="text-xs font-medium text-[var(--text-muted)]">© {new Date().getFullYear()} You² Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <Link href="/privacy" className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group">
              Privacy
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--text-primary)] transition-all group-hover:w-full"></span>
            </Link>
            <Link href="/terms" className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group">
              Terms
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--text-primary)] transition-all group-hover:w-full"></span>
            </Link>
            <Link href="/support" className="relative px-4 py-2 rounded-lg text-[var(--text-primary)] border transition-all hover:scale-105"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--surface2)' }}>
              Get Support
            </Link>
          </div>

        </div>
      </div>
    </footer>
  );
}
