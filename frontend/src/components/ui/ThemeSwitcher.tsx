import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SwatchIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTheme, ThemeId } from '../../context/ThemeContext';
import { THEMES } from '../../context/themes';

/**
 * Floating theme-switcher button.
 * Renders a palette icon in the bottom-right corner of the viewport.
 * Clicking it opens a panel showing swatches for all 5 themes.
 */
export default function ThemeSwitcher() {
  const { themeId, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    setOpen(false);
  };

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Theme panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="px-4 pt-4 pb-2">
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em] mb-3"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Choose Theme
              </p>
              <div className="flex flex-col gap-2 min-w-[200px]">
                {THEMES.map((t) => {
                  const active = t.id === themeId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelect(t.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 hover:scale-[1.02] active:scale-100"
                      style={{
                        background: active
                          ? `color-mix(in srgb, ${t.primary} 15%, transparent)`
                          : 'transparent',
                        border: `1px solid ${active ? t.primary + '60' : 'transparent'}`,
                      }}
                    >
                      {/* Swatch */}
                      <span
                        className="h-6 w-6 rounded-full shrink-0 shadow-md"
                        style={{
                          background: `linear-gradient(135deg, ${t.primary}, ${t.decorative['--deco-gradient-to']})`,
                          boxShadow: active ? `0 0 8px ${t.primary}80` : undefined,
                        }}
                      />
                      <span
                        className="text-xs font-bold flex-1 text-left"
                        style={{ color: active ? t.primary : 'var(--color-text-muted)' }}
                      >
                        {t.label}
                      </span>
                      {active && (
                        <CheckIcon
                          className="h-4 w-4 shrink-0"
                          style={{ color: t.primary }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className="px-4 py-3 mt-1 border-t border-white/5 text-[9px] uppercase tracking-widest font-bold text-center"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Preference saved automatically
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="h-12 w-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200"
        style={{
          background: `linear-gradient(135deg, var(--color-brand), color-mix(in srgb, var(--color-brand) 60%, black))`,
          boxShadow: `0 0 20px color-mix(in srgb, var(--color-brand) 35%, transparent)`,
          color: 'var(--color-background)',
        }}
        aria-label="Switch theme"
        title="Switch theme"
      >
        <SwatchIcon className="h-5 w-5" />
      </motion.button>
    </div>
  );
}
