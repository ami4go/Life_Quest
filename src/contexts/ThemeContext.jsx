import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ACCENT_THEMES } from '../utils/constants';

const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

const STORAGE_KEY = 'lifequest.accent';

function applyAccent(accentId) {
  const accent = ACCENT_THEMES.find((a) => a.id === accentId) || ACCENT_THEMES[0];
  const root = document.documentElement.style;
  root.setProperty('--accent-primary', accent.color);
  root.setProperty('--accent-primary-glow', accent.glow);
  root.setProperty('--accent-primary-soft', accent.soft);
  root.setProperty('--color-xp', accent.color);
  root.setProperty('--gradient-brand', `linear-gradient(135deg, ${accent.color}, #a855f7)`);
  root.setProperty('--gradient-xp', `linear-gradient(90deg, ${accent.color}, #ec4899)`);
  root.setProperty('--shadow-glow-cyan', `0 0 22px ${accent.glow}, 0 0 60px ${accent.glow}`);
}

export function ThemeProvider({ children }) {
  const [accent, setAccentState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'cyan'; } catch { return 'cyan'; }
  });

  useEffect(() => { applyAccent(accent); }, [accent]);

  const setAccent = useCallback((id) => {
    setAccentState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ accent, setAccent, themes: ACCENT_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
