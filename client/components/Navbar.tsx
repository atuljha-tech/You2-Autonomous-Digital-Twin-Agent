'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

const navLinks = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/reflection', label: 'Reflection' },
  { href: '/tasks', label: 'Action Plan' },
  { href: '/simulate', label: 'Simulation' },
  { href: '/chat', label: 'Chat' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-2xl transition-all duration-300 border-b"
      style={{
        background: dark ? 'rgba(11, 14, 20, 0.75)' : 'rgba(255, 255, 255, 0.8)',
        borderColor: 'var(--border-color)',
        boxShadow: dark ? '0 4px 30px rgba(0, 0, 0, 0.5)' : '0 4px 30px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Superior Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3 shadow-lg bg-black overflow-hidden">
            <div className="absolute inset-0 rounded-xl blur-md opacity-40 group-hover:opacity-70 transition-opacity"
                 style={{ background: 'linear-gradient(135deg, var(--green), var(--cyan))' }}></div>
            <img src="/logo.png" alt="You² Logo" className="relative z-10 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML += '<span class="relative z-10 text-white font-black text-sm tracking-tighter">Y²</span>'; }} />
          </div>
          <span className="text-xl font-black tracking-tight text-transparent bg-clip-text transition-all duration-300"
                style={{ backgroundImage: dark ? 'linear-gradient(to right, #fff, #9ca3af)' : 'linear-gradient(to right, #111827, #4b5563)' }}>
            You²
          </span>
        </Link>

        {/* Links (Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--surface)' }}>
          {navLinks.map(link => {
            const active = pathname === link.href || (pathname === '/' && link.href === '/dashboard');
            return (
              <Link key={link.href} href={link.href}
                className="relative px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 overflow-hidden group"
                style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                {active && (
                   <span className="absolute inset-0 rounded-xl opacity-100 transition-opacity duration-300" 
                         style={{ background: dark ? 'var(--surface2)' : 'rgba(0,0,0,0.05)' }}></span>
                )}
                {active && (
                   <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 rounded-full" 
                         style={{ background: 'linear-gradient(90deg, var(--green), var(--cyan))' }}></span>
                )}
                <span className="relative z-10 group-hover:text-[var(--text-primary)] transition-colors">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button onClick={toggle} 
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border" 
                  style={{ borderColor: 'var(--border-color)', background: 'var(--surface)' }}
                  title="Toggle Theme">
            {dark ? '☀️' : '🌙'}
          </button>
          
          <button className="lg:hidden w-10 h-10 rounded-full flex flex-col items-center justify-center gap-1.5 border transition-colors hover:bg-[var(--surface2)]"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--surface)' }}>
             <span className="w-5 h-0.5 rounded-full bg-[var(--text-primary)]"></span>
             <span className="w-5 h-0.5 rounded-full bg-[var(--text-primary)]"></span>
          </button>
        </div>
      </div>
    </nav>
  );
}
