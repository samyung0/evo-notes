import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeName = 'friendly' | 'notion';
export type ThemeMode = 'light' | 'dark';

export const THEMES: { value: ThemeName; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'notion', label: 'Notion' },
];

interface ThemeState {
  theme: ThemeName;
  mode: ThemeMode;
  setTheme: (t: ThemeName) => void;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

const THEME_KEY = 'evo.theme';
const MODE_KEY = 'evo.mode';

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  const v = localStorage.getItem(key) as T | null;
  return v && allowed.includes(v) ? v : fallback;
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() =>
    readStored<ThemeName>(THEME_KEY, ['friendly', 'notion'], 'friendly'),
  );
  const [mode, setModeState] = useState<ThemeMode>(() =>
    readStored<ThemeMode>(MODE_KEY, ['light', 'dark'], prefersDark() ? 'dark' : 'light'),
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.mode = mode;
  }, [theme, mode]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(MODE_KEY, m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(MODE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, mode, setTheme, setMode, toggleMode }),
    [theme, mode, setTheme, setMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
