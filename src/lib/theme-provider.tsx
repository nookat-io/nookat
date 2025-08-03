import React, { createContext, useContext, useEffect } from 'react';
import { useTheme } from '../hooks/use-theme';
import { Theme } from '../types/config';

type ThemeContextType = {
  theme: string;
  loading: boolean;
  error: string | null;
  updateTheme: (theme: Theme) => Promise<boolean>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, loading, error, updateTheme } = useTheme();

  // Apply theme to document
  useEffect(() => {
    if (!loading) {
      const root = document.documentElement;
      const body = document.body;

      // Remove existing theme classes
      root.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');

      // Apply the current theme
      if (theme === Theme.System) {
        // Check system preference
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

  // Listen for system theme changes when using 'system' theme
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
