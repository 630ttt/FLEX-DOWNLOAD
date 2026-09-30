import { useCallback, useEffect, useState } from 'react';
import lightModeLogo from '../assets/yamini-flex-logo-transparent.webp';
import darkModeLogo from '../assets/yamini-flex-logo.webp';

const STORAGE_KEY = 'yamini-theme';

export function useSiteTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(STORAGE_KEY) || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = theme === 'dark' ? darkModeLogo : lightModeLogo;
      favicon.type = 'image/webp';
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
