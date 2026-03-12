'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { THEME_PRESETS, type ThemePreset } from './themes';

interface ThemeContextType {
  preset: string;
  customColors: ThemePreset['colors'] | null;
  setPreset: (id: string) => void;
  setCustomColor: (key: keyof ThemePreset['colors'], value: string) => void;
  resetCustomColors: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeColors(colors: ThemePreset['colors']) {
  const root = document.documentElement;
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-foreground', colors.accentForeground);
}

export function ThemePresetProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState(() => {
    if (typeof window === 'undefined') return 'default';
    return localStorage.getItem('devradar-theme-preset') ?? 'default';
  });
  const [customColors, setCustomColors] = useState<ThemePreset['colors'] | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('devradar-theme-custom');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (customColors) {
      applyThemeColors(customColors);
    } else {
      const presetData = THEME_PRESETS.find((p) => p.id === preset);
      if (presetData) applyThemeColors(presetData.colors);
    }
  }, []);

  const setPreset = useCallback((id: string) => {
    setPresetState(id);
    setCustomColors(null);
    localStorage.setItem('devradar-theme-preset', id);
    localStorage.removeItem('devradar-theme-custom');
    const presetData = THEME_PRESETS.find((p) => p.id === id);
    if (presetData) applyThemeColors(presetData.colors);
  }, []);

  const setCustomColor = useCallback((key: keyof ThemePreset['colors'], value: string) => {
    setCustomColors((prev) => {
      const current = prev ?? THEME_PRESETS[0]!.colors;
      const updated = { ...current, [key]: value };
      localStorage.setItem('devradar-theme-custom', JSON.stringify(updated));
      applyThemeColors(updated);
      return updated;
    });
    setPresetState('custom');
    localStorage.setItem('devradar-theme-preset', 'custom');
  }, []);

  const resetCustomColors = useCallback(() => {
    setCustomColors(null);
    setPreset('default');
  }, [setPreset]);

  return (
    <ThemeContext.Provider
      value={{ preset, customColors, setPreset, setCustomColor, resetCustomColors }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreset() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemePreset must be used within ThemePresetProvider');
  return context;
}
