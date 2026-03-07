import React from 'react';

const ThemeContext = React.createContext(null);

const STORAGE_KEY = 'nb-theme';

function normalizeTheme(value) {
  const v = String(value || '').toLowerCase();
  return v === 'dark' || v === 'light' ? v : null;
}

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  if (!window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
    if (saved) return { theme: saved, source: 'user' };
  } catch {
    // ignore
  }
  return { theme: getSystemTheme(), source: 'system' };
}

function applyThemeToDom(theme) {
  if (typeof document === 'undefined') return;
  const t = normalizeTheme(theme) || 'light';
  document.documentElement.dataset.theme = t;
}

export function ThemeProvider({ children }) {
  const [{ theme, source }, setState] = React.useState(() => getInitialTheme());

  React.useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  // If user hasn't explicitly chosen a theme, follow system changes.
  React.useEffect(() => {
    if (source !== 'system') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setState({ theme: mq.matches ? 'dark' : 'light', source: 'system' });

    // Safari supports addListener/removeListener.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }

    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [source]);

  const setTheme = React.useCallback((nextTheme) => {
    const normalized = normalizeTheme(nextTheme);
    if (!normalized) return;

    setState({ theme: normalized, source: 'user' });

    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const clearThemePreference = React.useCallback(() => {
    setState({ theme: getSystemTheme(), source: 'system' });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = React.useMemo(() => ({
    theme,
    source,
    setTheme,
    toggleTheme,
    clearThemePreference,
  }), [theme, source, setTheme, toggleTheme, clearThemePreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
