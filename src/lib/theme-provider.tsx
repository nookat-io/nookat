import React, { useEffect } from 'react';
import { useConfig } from '../hooks/use-config';
import { Theme } from '../types/config';
import { ThemeContext } from '../contexts/theme-context';

export const THEME_FOR_FIRST_PAINT_KEY = 'nookat-theme';

const systemPrefersDark = () =>
  window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme: Theme) {
  const resolvedTheme =
    theme === Theme.System
      ? systemPrefersDark().matches
        ? Theme.Dark
        : Theme.Light
      : theme;

  for (const element of [document.documentElement, document.body]) {
    element.classList.remove(Theme.Light, Theme.Dark);
    element.classList.add(resolvedTheme);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { config, loading, error, updateTheme } = useConfig();
  const configuredTheme = config?.theme;
  const theme = configuredTheme ?? Theme.System;

  useEffect(() => {
    if (!configuredTheme) {
      return;
    }

    applyTheme(configuredTheme);
    localStorage.setItem(THEME_FOR_FIRST_PAINT_KEY, configuredTheme);

    if (configuredTheme !== Theme.System) {
      return;
    }

    const colorScheme = systemPrefersDark();
    const followSystemTheme = () => applyTheme(Theme.System);
    colorScheme.addEventListener('change', followSystemTheme);
    return () => colorScheme.removeEventListener('change', followSystemTheme);
  }, [configuredTheme]);

  return (
    <ThemeContext.Provider value={{ theme, loading, error, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
