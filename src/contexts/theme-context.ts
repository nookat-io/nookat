import { createContext } from 'react';
import { Theme } from '../types/config';

type ThemeContextType = {
  theme: string;
  loading: boolean;
  error: string | null;
  updateTheme: (theme: Theme) => Promise<void>;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);
