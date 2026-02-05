'use client';

import { useState, useEffect } from 'react';

type Theme = 'system' | 'light' | 'dark';

export default function DarkModeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved && ['system', 'light', 'dark'].includes(saved)) {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
    } else if (t === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }

  function cycleTheme() {
    const order: Theme[] = ['system', 'light', 'dark'];
    const nextIdx = (order.indexOf(theme) + 1) % order.length;
    const next = order[nextIdx];
    setTheme(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  }

  const icons: Record<Theme, JSX.Element> = {
    system: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    light: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    dark: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  };

  const labels: Record<Theme, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  };

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      title={`Theme: ${labels[theme]}`}
      aria-label={`Switch theme (current: ${labels[theme]})`}
    >
      {icons[theme]}
    </button>
  );
}
