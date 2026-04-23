/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme-aware CSS-variable colours (change with every theme switch)
        brand:      'var(--color-brand)',
        brandDark:  'color-mix(in srgb, var(--color-brand) 70%, black)',
        background: 'var(--color-background)',
        surface:    'var(--color-surface)',
        textLight:  'var(--color-text-muted)',

        // Static palette kept for backwards-compat / non-themed uses
        primary: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease-out',
        'slide-up':   'slideUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'class-pulse': 'classPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        classPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 color-mix(in srgb, var(--color-brand) 0%, transparent)' },
          '50%': { boxShadow: '0 0 0 6px color-mix(in srgb, var(--color-brand) 20%, transparent)' },
        },
      },
    },
  },
  plugins: [],
}
