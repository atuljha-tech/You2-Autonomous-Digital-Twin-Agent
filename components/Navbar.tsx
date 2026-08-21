'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { CircleUserRound, Menu, X } from 'lucide-react';

const LOGO_PATH =
  'M 128 128 C 198.692 128 256 185.308 256 256 L 151.883 256 C 149.812 220.307 120.213 192 84 192 C 47.787 192 18.188 220.307 16.117 256 L 0 256 C 0 185.308 57.308 128 128 128 Z M 104.117 0 C 106.188 35.694 135.787 64 172 64 C 208.213 64 237.812 35.694 239.883 0 L 256 0 C 256 70.692 198.692 128 128 128 C 57.308 128 0 70.692 0 0 Z';

const lg: React.CSSProperties = {
  background: 'rgba(255,255,255,0.01)',
  backgroundBlendMode: 'luminosity',
  WebkitBackdropFilter: 'blur(4px)',
  backdropFilter: 'blur(4px)',
  border: 'none',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)',
  position: 'relative',
  overflow: 'hidden',
};

function GradientBorder() {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        padding: '1.4px',
        background:
          'linear-gradient(180deg,rgba(255,255,255,0.45) 0%,rgba(255,255,255,0.15) 20%,transparent 40%,transparent 60%,rgba(255,255,255,0.15) 80%,rgba(255,255,255,0.45) 100%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
    />
  );
}

const navLinks = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/reflection', label: 'Reflection' },
  { href: '/tasks',      label: 'Tasks' },
  { href: '/simulate',   label: 'Simulate' },
  { href: '/insights',   label: 'Insights' },
  { href: '/chat',       label: 'Chat' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('you2_user_id');
    localStorage.removeItem('you2_user_name');
    router.push('/');
  };

  return (
    <>
      <style>{`
        .lg-nav-link {
          color: rgba(255,255,255,0.70);
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: color 150ms;
          white-space: nowrap;
        }
        .lg-nav-link:hover { color: white; }
        .lg-nav-link-active { color: white; }

        .lg-menu-link {
          font-size: 1.5rem;
          font-weight: 500;
          color: white;
          text-decoration: none;
          transition: opacity 200ms;
        }
        .lg-menu-link:hover { opacity: 0.7; }
        
        .lg-overlay {
          transition: opacity 500ms ease-out;
          opacity: 0;
          pointer-events: none;
        }
        .lg-overlay-open {
          opacity: 1;
          pointer-events: auto;
        }

        @media (min-width: 768px) {
          .lg-mobile-only { display: none !important; }
        }
        @media (max-width: 767px) {
          .lg-desktop-only { display: none !important; }
        }
      `}</style>

      {/* ── Mobile menu overlay ──────────────────────────── */}
      <div
        className={`lg-overlay lg-mobile-only${menuOpen ? ' lg-overlay-open' : ''}`}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.80)',
          WebkitBackdropFilter: 'blur(20px)',
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
          <Link href="/" className="lg-menu-link" onClick={() => setMenuOpen(false)}>Home</Link>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className="lg-menu-link" onClick={() => setMenuOpen(false)}>{link.label}</Link>
          ))}

          {/* Account */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem', marginTop: '.5rem' }}>
            <div style={{ ...lg, borderRadius: '9999px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GradientBorder />
              <CircleUserRound size={20} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
            </div>
            <button onClick={handleLogout} style={{ fontSize: '.875rem', fontWeight: 300, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>
      </div>

      <nav style={{
        position: 'sticky', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(1rem,2vw,1.25rem) clamp(1.25rem,5vw,5rem)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(11,14,20,0.75)',
      }}>
        {/* Logo */}
        <Link href="/" style={{ flexShrink: 0 }}>
          <svg width="32" height="32" viewBox="0 0 256 256" fill="white" aria-label="You²">
            <path d={LOGO_PATH} />
          </svg>
        </Link>

        {/* Centre pill — desktop only */}
        <div
          className="lg-desktop-only"
          style={{ ...lg, borderRadius: '9999px', padding: '.75rem 2rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}
        >
          <GradientBorder />
          {navLinks.map(link => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`lg-nav-link ${active ? 'lg-nav-link-active' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right actions — desktop */}
        <div className="lg-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/create-twin"
            style={{ ...lg, borderRadius: '9999px', padding: '.6rem 1.25rem', fontSize: '.8rem', fontWeight: 500, color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            <GradientBorder />
            Create Twin
          </Link>
          <button
            onClick={toggle}
            style={{ ...lg, borderRadius: '9999px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}
          >
            <GradientBorder />
            <span style={{ fontSize: '1rem' }}>{dark ? '☀️' : '🌙'}</span>
          </button>
          <button
            onClick={handleLogout}
            style={{ ...lg, borderRadius: '9999px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}
          >
            <GradientBorder />
            <CircleUserRound size={20} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
          </button>
        </div>

        {/* Hamburger — mobile only */}
        <button
          className="lg-mobile-only"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          style={{ ...lg, borderRadius: '9999px', width: 40, height: 40, border: 'none', cursor: 'pointer', zIndex: 110, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <GradientBorder />
          <span style={{ position: 'relative', width: 20, height: 20 }}>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 300ms, transform 300ms', opacity: menuOpen ? 0 : 1, transform: menuOpen ? 'rotate(-90deg) scale(0)' : 'none' }}>
              <Menu size={20} color="white" strokeWidth={1.5} />
            </span>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 300ms, transform 300ms', opacity: menuOpen ? 1 : 0, transform: menuOpen ? 'none' : 'rotate(90deg) scale(0)' }}>
              <X size={20} color="white" strokeWidth={1.5} />
            </span>
          </span>
        </button>
      </nav>
    </>
  );
}
