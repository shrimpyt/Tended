import { useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [isDark, setIsDark] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tended_theme') as ThemePreference;
    if (saved) setThemeState(saved);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      let resolved: boolean;
      if (theme === 'system') {
        resolved = mediaQuery.matches;
      } else {
        resolved = theme === 'dark';
      }

      setIsDark(resolved);
      if (resolved) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('tended_theme', theme);
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  const setTheme = (t: ThemePreference) => {
    setThemeState(t);
  };

  return { theme, isDark, setTheme };
}
