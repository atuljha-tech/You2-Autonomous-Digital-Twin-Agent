'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleUserRound, Menu, X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   You² Landing Page
   Full-screen hero with liquid-glass UI over background video.
   The Navbar / Footer are suppressed on this route via ConditionalLayout.
───────────────────────────────────────────────────────────────────────────── */

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_082433_69699cf8-444b-4484-93cc-053e57896dfd.mp4';

const LOGO_PATH =
  'M 128 128 C 198.692 128 256 185.308 256 256 L 151.883 256 C 149.812 220.307 120.213 192 84 192 C 47.787 192 18.188 220.307 16.117 256 L 0 256 C 0 185.308 57.308 128 128 128 Z M 104.117 0 C 106.188 35.694 135.787 64 172 64 C 208.213 64 237.812 35.694 239.883 0 L 256 0 C 256 70.692 198.692 128 128 128 C 57.308 128 0 70.692 0 0 Z';

const AVATAR_URLS = [
  'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100',
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
  'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=100',
];

/* ── Liquid glass base style ── */
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

/* Gradient border — mask-composite exclude trick */
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

/* Triangular dot-pattern icon */
function TriangleDots() {
  const pts = [
    { t: 0, l: 8 },
    { t: 6, l: 3 }, { t: 6, l: 13 },
    { t: 12, l: 0 }, { t: 12, l: 8 }, { t: 12, l: 16 },
  ];
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 20, height: 18, flexShrink: 0 }}>
      {pts.map((p, i) => (
        <span
          key={i}
          style={{ position: 'absolute', top: p.t, left: p.l, width: 2.5, height: 2.5, background: 'rgba(255,255,255,0.6)' }}
        />
      ))}
    </span>
  );
}

/* 3×3 checkerboard grid icon */
function CheckerGrid() {
  return (
    <span style={{ display: 'grid', gridTemplateColumns: 'repeat(3,4px)', gap: 2, flexShrink: 0 }}>
      {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((on, i) => (
        <span
          key={i}
          style={{ width: 4, height: 4, borderRadius: 1, background: on ? 'rgba(255,255,255,0.6)' : 'transparent' }}
        />
      ))}
    </span>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; }

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

        .lg-cta-btn { transition: background 300ms; }
        .lg-cta-btn:hover { background: rgba(255,255,255,0.10) !important; }

        .lg-overlay {
          transition: opacity 500ms ease-out;
          opacity: 0;
          pointer-events: none;
        }
        .lg-overlay-open {
          opacity: 1;
          pointer-events: auto;
        }
        .lg-overlay-inner {
          transition: opacity 500ms ease-out, transform 500ms ease-out;
          opacity: 0;
          transform: translateY(-2rem);
        }
        .lg-overlay-open .lg-overlay-inner {
          opacity: 1;
          transform: translateY(0);
        }

        .lg-body { transition: opacity 300ms; }

        @media (min-width: 768px) {
          .lg-mobile-only { display: none !important; }
          .lg-overlay { display: none !important; }
        }
        @media (max-width: 767px) {
          .lg-desktop-only { display: none !important; }
        }
      `}</style>

      {/* Root — full viewport, no overflow */}
      <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', WebkitFontSmoothing: 'antialiased' } as React.CSSProperties}>

        {/* Background video is now globally handled in layout.tsx */}

        {/* ── Mobile menu overlay ──────────────────────────── */}
        <div
          className={`lg-overlay lg-mobile-only${menuOpen ? ' lg-overlay-open' : ''}`}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.80)',
            WebkitBackdropFilter: 'blur(20px)',
            backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div className="lg-overlay-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <a href="#" className="lg-menu-link" onClick={close}>Home</a>
            <a href="#" className="lg-menu-link" onClick={close}>Our Approach</a>
            <a href="#" className="lg-menu-link" onClick={close}>Healing Methods</a>
            <Link href="/dashboard" className="lg-menu-link" onClick={close} style={{ opacity: 0.7, fontSize: '1.125rem' }}>Dashboard →</Link>

            {/* Account */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem', marginTop: '.5rem' }}>
              <div style={{ ...lg, borderRadius: '9999px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GradientBorder />
                <CircleUserRound size={20} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: '.875rem', fontWeight: 300, color: 'rgba(255,255,255,0.60)' }}>Account</span>
            </div>
          </div>
        </div>



        {/* ── Main content ─────────────────────────────────── */}
        <div
          className="lg-body"
          style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            padding: '0 clamp(1.25rem,5vw,5rem) clamp(2rem,4vw,3rem)',
            opacity: menuOpen ? 0 : 1,
            pointerEvents: menuOpen ? 'none' : 'auto',
          }}
        >
          {/* ── Top block ── */}
          <div style={{ marginTop: 'clamp(3.5rem,8vw,7rem)', maxWidth: '44rem' }}>

            {/* Badge */}
            <div style={{ ...lg, borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: 'clamp(.625rem,.8vw,.75rem)', padding: 'clamp(.375rem,.5vw,.5rem) clamp(.75rem,1.2vw,1rem)', marginBottom: 'clamp(1.25rem,1.5vw,1.5rem)' }}>
              <GradientBorder />
              {/* Avatars */}
              <div style={{ display: 'flex' }}>
                {AVATAR_URLS.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    style={{ width: 'clamp(20px,2.5vw,24px)', height: 'clamp(20px,2.5vw,24px)', borderRadius: '9999px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.20)', marginLeft: i === 0 ? 0 : -8 }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 'clamp(.75rem,.9vw,.875rem)', fontWeight: 300, color: 'rgba(255,255,255,0.80)', whiteSpace: 'nowrap' }}>
                your autonomous digital twin
              </span>
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: 'clamp(2.5rem,8vw,5rem)', fontWeight: 400, lineHeight: 1.05, color: 'white', letterSpacing: '-0.05em', margin: 0 }}>
              Know Yourself.<br />Engineer<br />Your Future.
            </h1>

            {/* Subtitle */}
            <p style={{ marginTop: 'clamp(1rem,1.5vw,1.25rem)', fontSize: 'clamp(.875rem,1.8vw,1.125rem)', fontWeight: 300, color: 'rgba(255,255,255,0.70)', lineHeight: 1.6, maxWidth: '34rem' }}>
              An AI agent that watches, learns, and simulates you — then nudges you back on track in real-time.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginTop: 'clamp(1.5rem,2vw,2rem)' }}>
              <Link
                href="/create-twin"
                className="lg-cta-btn"
                style={{ ...lg, borderRadius: '9999px', padding: 'clamp(.75rem,.9vw,.875rem) clamp(1.5rem,2vw,1.75rem)', fontSize: '.875rem', fontWeight: 600, color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}
              >
                <GradientBorder />
                Initialize Twin →
              </Link>
              <Link
                href="/dashboard"
                className="lg-cta-btn"
                style={{ ...lg, borderRadius: '9999px', padding: 'clamp(.75rem,.9vw,.875rem) clamp(1.5rem,2vw,1.75rem)', fontSize: '.875rem', fontWeight: 400, color: 'rgba(255,255,255,0.75)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              >
                <GradientBorder />
                Open Dashboard
              </Link>
            </div>
          </div>

          {/* ── Bottom stats ── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(1.5rem,4vw,4rem)' }}>

            {/* Stat 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              <TriangleDots />
              <span style={{ fontSize: 'clamp(1.25rem,3vw,1.875rem)', fontWeight: 400, color: 'white', lineHeight: 1 }}>
                48 Hours
              </span>
              <span style={{ fontSize: 'clamp(.7rem,1.2vw,.875rem)', fontWeight: 300, color: 'rgba(255,255,255,0.60)' }}>
                to build your twin
              </span>
            </div>

            {/* Stat 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              <CheckerGrid />
              <span style={{ fontSize: 'clamp(1.25rem,3vw,1.875rem)', fontWeight: 400, color: 'white', lineHeight: 1 }}>
                Real-Time
              </span>
              <span style={{ fontSize: 'clamp(.7rem,1.2vw,.875rem)', fontWeight: 300, color: 'rgba(255,255,255,0.60)' }}>
                behaviour tracking
              </span>
            </div>

            {/* Stat 3 */}
            <div className="lg-desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              <span style={{ display: 'grid', gridTemplateColumns: 'repeat(2,6px)', gap: 3, flexShrink: 0, marginBottom: 2 }}>
                {[1, 1, 1, 1].map((_, i) => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
                ))}
              </span>
              <span style={{ fontSize: 'clamp(1.25rem,3vw,1.875rem)', fontWeight: 400, color: 'white', lineHeight: 1 }}>
                Gemini AI
              </span>
              <span style={{ fontSize: 'clamp(.7rem,1.2vw,.875rem)', fontWeight: 300, color: 'rgba(255,255,255,0.60)' }}>
                simulation engine
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
