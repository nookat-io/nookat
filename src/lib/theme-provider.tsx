import React, { createContext, useContext, useEffect } from 'react';
import { useConfig } from '../hooks/use-config';
import { Theme } from '../types/config';

type ThemeContextType = {
  theme: string;
  loading: boolean;
  error: string | null;
  updateTheme: (theme: Theme) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { config, loading, error, updateTheme } = useConfig();
  const theme = config?.theme || Theme.System;

  useEffect(() => {
    if (!loading) {
      const root = document.documentElement;
      const body = document.body;

      root.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');

      if (theme === Theme.System) {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light';
        root.classList.add(systemTheme);
        body.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
        body.classList.add(theme);
      }
    }
  }, [theme, loading]);

  useEffect(() => {
    if (theme === Theme.System) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        const root = document.documentElement;
        const body = document.body;
        root.classList.remove('light', 'dark');
        body.classList.remove('light', 'dark');
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
        body.classList.add(systemTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, loading, error, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
