import { ThemeDefinition } from './ThemeContext';

/**
 * All 5 InsightU themes.
 * Each theme exposes CSS custom properties that Tailwind and component
 * styles consume via `var(--color-*)` and `var(--deco-*)`.
 */
export const THEMES: ThemeDefinition[] = [
  // ── 1. Spiderman ────────────────────────────────────────────────────────────
  {
    id: 'spiderman',
    label: 'Spiderman',
    primary: '#E23636',
    background: '#0A0A0F',
    surface: '#16161F',
    textMuted: '#A0A0B0',
    isLight: false,
    decorative: {
      '--deco-particle-color': '#E23636',
      '--deco-particle-secondary': '#1A1AFF',
      '--deco-web-line-color': 'rgba(226,54,54,0.15)',
      '--deco-web-dot-color': 'rgba(226,54,54,0.4)',
      '--deco-halftone-color': 'rgba(226,54,54,0.06)',
      '--deco-action-line-color': 'rgba(255,255,255,0.04)',
      '--deco-glow-color': 'rgba(226,54,54,0.25)',
      '--deco-gradient-from': '#E23636',
      '--deco-gradient-to': '#1A1AFF',
    },
  },

  // ── 2. Doraemon ─────────────────────────────────────────────────────────────
  {
    id: 'doraemon',
    label: 'Doraemon',
    primary: '#1E90FF',
    background: '#0D1B2A',
    surface: '#112236',
    textMuted: '#8AADCC',
    isLight: false,
    decorative: {
      '--deco-particle-color': '#1E90FF',
      '--deco-particle-secondary': '#FFD700',
      '--deco-web-line-color': 'rgba(30,144,255,0.12)',
      '--deco-web-dot-color': 'rgba(30,144,255,0.35)',
      '--deco-halftone-color': 'rgba(30,144,255,0.05)',
      '--deco-action-line-color': 'rgba(255,215,0,0.04)',
      '--deco-glow-color': 'rgba(30,144,255,0.3)',
      '--deco-gradient-from': '#1E90FF',
      '--deco-gradient-to': '#FFD700',
    },
  },

  // ── 3. Dark Professional ────────────────────────────────────────────────────
  {
    id: 'dark-professional',
    label: 'Dark Pro',
    primary: '#66FCF1',
    background: '#0B0C10',
    surface: '#1F2833',
    textMuted: '#C5C6C7',
    isLight: false,
    decorative: {
      '--deco-particle-color': '#66FCF1',
      '--deco-particle-secondary': '#45A29E',
      '--deco-web-line-color': 'rgba(102,252,241,0.08)',
      '--deco-web-dot-color': 'rgba(102,252,241,0.25)',
      '--deco-halftone-color': 'rgba(102,252,241,0.04)',
      '--deco-action-line-color': 'rgba(102,252,241,0.03)',
      '--deco-glow-color': 'rgba(102,252,241,0.2)',
      '--deco-gradient-from': '#66FCF1',
      '--deco-gradient-to': '#45A29E',
    },
  },

  // ── 4. Standard Professional ────────────────────────────────────────────────
  {
    id: 'standard-professional',
    label: 'Standard Pro',
    primary: '#4F46E5',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    textMuted: '#64748B',
    isLight: true,
    decorative: {
      '--deco-particle-color': '#4F46E5',
      '--deco-particle-secondary': '#7C3AED',
      '--deco-web-line-color': 'rgba(79,70,229,0.08)',
      '--deco-web-dot-color': 'rgba(79,70,229,0.2)',
      '--deco-halftone-color': 'rgba(79,70,229,0.03)',
      '--deco-action-line-color': 'rgba(79,70,229,0.03)',
      '--deco-glow-color': 'rgba(79,70,229,0.15)',
      '--deco-gradient-from': '#4F46E5',
      '--deco-gradient-to': '#7C3AED',
    },
  },

  // ── 5. Anime / Cartoon ──────────────────────────────────────────────────────
  {
    id: 'anime',
    label: 'Anime',
    primary: '#FF6B9D',
    background: '#1A0A2E',
    surface: '#2A1040',
    textMuted: '#C9A8D4',
    isLight: false,
    decorative: {
      '--deco-particle-color': '#FF6B9D',
      '--deco-particle-secondary': '#FFD700',
      '--deco-web-line-color': 'rgba(255,107,157,0.12)',
      '--deco-web-dot-color': 'rgba(255,107,157,0.35)',
      '--deco-halftone-color': 'rgba(255,107,157,0.05)',
      '--deco-action-line-color': 'rgba(255,215,0,0.04)',
      '--deco-glow-color': 'rgba(255,107,157,0.3)',
      '--deco-gradient-from': '#FF6B9D',
      '--deco-gradient-to': '#FFD700',
    },
  },
];
