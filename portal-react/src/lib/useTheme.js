import { useCallback, useEffect, useState } from 'react';

const KEY = 'enerops-theme';

/**
 * Light is the default; dark is opt-in and remembered. index.html applies the
 * stored value before first paint, so there is no flash — this hook only keeps
 * React in step with the attribute that is already on <html>.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem(KEY, theme); } catch (e) { /* private mode */ }
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => (t === 'dark' ? 'light' : 'dark')), []);
  return [theme, toggle];
}
