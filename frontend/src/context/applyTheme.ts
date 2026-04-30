import type { ThemeId, ThemeDefinition } from './ThemeContext';

export function applyTheme(themeId: ThemeId, themes: ThemeDefinition[]): void {
  const theme = themes.find((t) => t.id === themeId);
  if (!theme) return;

  const root = document.documentElement;
  root.style.setProperty('--color-brand', theme.primary);
  root.style.setProperty('--color-background', theme.background);
  root.style.setProperty('--color-surface', theme.surface);
  root.style.setProperty('--color-text-muted', theme.textMuted);

  Object.entries(theme.decorative).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  if (theme.isLight) {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
}
