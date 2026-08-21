'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({
  dark: false,
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Graceful Production Migration: Restore legacy twinmind keys if found
    const legacyId = localStorage.getItem('twinmind_user_id');
    if (legacyId && !localStorage.getItem('you2_user_id')) {
      localStorage.setItem('you2_user_id', legacyId);
      const legacyName = localStorage.getItem('twinmind_user_name');
      if (legacyName) localStorage.setItem('you2_user_name', legacyName);
    }

    const saved = localStorage.getItem('you2_theme');
    const isDark = saved === 'dark';
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggle = () => {
    setDark(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('you2_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
