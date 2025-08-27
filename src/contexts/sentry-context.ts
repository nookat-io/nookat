import { createContext } from 'react';

type SentryContextType = {
  isInitialized: boolean;
  error: string | null;
};

export const SentryContext = createContext<SentryContextType | undefined>(
  undefined
);
