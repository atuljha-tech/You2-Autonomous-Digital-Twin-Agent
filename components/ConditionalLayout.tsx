'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ThemeProvider from '@/components/ThemeProvider';

// Routes that get NO navbar/footer (standalone full-screen)
const BARE_ROUTES = ['/'];

// Routes that get navbar/footer but NO max-width constraint
const FULL_WIDTH_ROUTES = ['/create-twin'];

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isBare = BARE_ROUTES.includes(pathname);

  // Global background video for all pages
  const backgroundVideo = (
    <video
      src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_082433_69699cf8-444b-4484-93cc-053e57896dfd.mp4"
      autoPlay loop muted playsInline
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -2 }}
    />
  );

  // Dynamic tint layer so content remains readable on non-bare routes
  const backgroundTint = !isBare && (
    <div 
      style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'var(--bg-primary)', opacity: 0.85, backdropFilter: 'blur(8px)' }}
    />
  );

  if (isBare) {
    return (
      <ThemeProvider>
        {backgroundVideo}
        <Navbar />
        {children}
      </ThemeProvider>
    );
  }

  if (FULL_WIDTH_ROUTES.includes(pathname)) {
    return (
      <ThemeProvider>
        {backgroundVideo}
        {backgroundTint}
        <Navbar />
        <main className="flex-1 w-full relative z-10">{children}</main>
        <Footer />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {backgroundVideo}
      {backgroundTint}
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 relative z-10">{children}</main>
      <Footer />
    </ThemeProvider>
  );
}
