import * as Sentry from '@sentry/react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useConfig } from '../hooks/use-config';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

type SentryContextType = {
  isInitialized: boolean;
  error: string | null;
};

const SentryContext = createContext<SentryContextType | undefined>(undefined);

export function SentryProvider({ children }: { children: React.ReactNode }) {
  const { config, loading } = useConfig();
  const [isInitialized, setIsInitialized] = useState(false);
  const [sentryError, setSentryError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const shouldEnableCrashReporting =
      config?.startup?.crash_reporting ?? false;

    if (shouldEnableCrashReporting && SENTRY_DSN) {
      try {
        Sentry.init({
          dsn: SENTRY_DSN,
          sendDefaultPii: false,
          integrations: [
            Sentry.replayIntegration({
              maskAllText: false,
              blockAllMedia: false,
            }),
            Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
          ],
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        });
        setIsInitialized(true);
        setSentryError(null);
        console.log('Sentry initialized');
      } catch (err) {
        console.error('Failed to initialize Sentry:', err);
        setSentryError(
          err instanceof Error ? err.message : 'Failed to initialize Sentry'
        );
        setIsInitialized(false);
      }
    } else {
      console.log('Sentry is disabled or no DSN provided');
      setIsInitialized(false);
      setSentryError(null);
    }
  }, [config?.startup?.crash_reporting, loading]);

  return (
    <SentryContext.Provider value={{ isInitialized, error: sentryError }}>
      {children}
    </SentryContext.Provider>
  );
}

export function useSentryContext() {
  const context = useContext(SentryContext);
  if (context === undefined) {
    throw new Error('useSentryContext must be used within a SentryProvider');
  }
  return context;
}

export { Sentry };
