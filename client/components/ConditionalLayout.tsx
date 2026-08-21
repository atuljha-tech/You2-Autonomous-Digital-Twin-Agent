'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ThemeProvider from '@/components/ThemeProvider';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  if (isHome) {
    // Landing page — no chrome, no constraints, full viewport
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  return (
    <ThemeProvider>
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {children}
      </main>
      <Footer />
    </ThemeProvider>
  );
}
