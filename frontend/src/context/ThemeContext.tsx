import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserRole } from '../store/useAuthStore';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeId =
  | 'spiderman'
  | 'doraemon'
  | 'dark-professional'
  | 'standard-professional'
  | 'anime';

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  /** Primary accent colour (hex) */
  primary: string;
  /** Page background colour (hex) */
  background: string;
  /** Surface / card colour (hex) */
  surface: string;
  /** Muted text colour (hex) */
  textMuted: string;
  /** Whether the theme is light-mode */
  isLight: boolean;
  /** Decorative CSS-variable values specific to this theme */
  decorative: Record<string, string>;
}

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeDefinition;
  setTheme: (id: ThemeId) => void;
}

// ─── Default role → theme mapping ─────────────────────────────────────────────

export function resolveDefaultTheme(role: UserRole): ThemeId {
  switch (role) {
    case 'STUDENT':
      return 'spiderman';
    case 'TEACHER':
      return 'standard-professional';
    case 'PARENT':
      return 'doraemon';
    case 'ADMIN':
      return 'dark-professional';
    default:
      return 'dark-professional';
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

// ─── CSS variable application ─────────────────────────────────────────────────

export function applyTheme(themeId: ThemeId, themes: ThemeDefinition[]): void {
  const theme = themes.find((t) => t.id === themeId);
  if (!theme) return;

  const root = document.documentElement;

  root.style.setProperty('--color-brand', theme.primary);
  root.style.setProperty('--color-background', theme.background);
  root.style.setProperty('--color-surface', theme.surface);
  root.style.setProperty('--color-text-muted', theme.textMuted);

  // Apply decorative variables
  Object.entries(theme.decorative).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Toggle light/dark class on <html>
  if (theme.isLight) {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'insightu-theme';

interface ThemeProviderProps {
  children: ReactNode;
  themes: ThemeDefinition[];
  /** If provided, used to resolve the default theme on first login */
  userRole?: UserRole;
  /** JWT token for persisting preference to the API */
  token?: string | null;
}

export function ThemeProvider({ children, themes, userRole, token }: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && themes.some((t) => t.id === stored)) return stored;
    if (userRole) return resolveDefaultTheme(userRole);
    return 'dark-professional';
  });

  // Re-resolve default when the user first logs in (role changes from undefined)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (!stored && userRole) {
      const defaultTheme = resolveDefaultTheme(userRole);
      setThemeId(defaultTheme);
    }
  }, [userRole]);

  // Apply CSS variables whenever themeId changes
  useEffect(() => {
    applyTheme(themeId, themes);
  }, [themeId, themes]);

  const setTheme = (id: ThemeId) => {
    setThemeId(id);
    localStorage.setItem(STORAGE_KEY, id);

    // Persist to backend (fire-and-forget)
    if (token) {
      axios
        .patch(
          '/api/user/preferences',
          { theme: id },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .catch(() => {
          // Non-critical — local preference is already saved
        });
    }
  };

  const theme = themes.find((t) => t.id === themeId) ?? themes[0];

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
