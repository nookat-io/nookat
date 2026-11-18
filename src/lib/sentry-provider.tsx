import * as Sentry from '@sentry/react';
import React, { useEffect, useSyncExternalStore } from 'react';
import { useConfig } from '../hooks/use-config';
import { SentryContext } from '../contexts/sentry-context';
import { errorMessage } from '../utils/error-message';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

interface SentryStatus {
  isInitialized: boolean;
  error: string | null;
}

const SENTRY_OFF: SentryStatus = { isInitialized: false, error: null };
const SENTRY_ON: SentryStatus = { isInitialized: true, error: null };

let sentryStatus = SENTRY_OFF;
const sentryStatusListeners = new Set<() => void>();

function publishSentryStatus(status: SentryStatus) {
  sentryStatus = status;
  sentryStatusListeners.forEach(listener => listener());
}

function subscribeToSentryStatus(listener: () => void) {
  sentryStatusListeners.add(listener);
  return () => {
    sentryStatusListeners.delete(listener);
  };
}

function readSentryStatus() {
  return sentryStatus;
}

function initSentry(): SentryStatus {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpBodies: [],
      },
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
        Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
      ],
      replaysSessionSampleRate: 0.0,
      replaysOnErrorSampleRate: 1.0,
    });
    console.log('Sentry initialized');
    return SENTRY_ON;
  } catch (err) {
    console.error('Failed to initialize Sentry:', err);
    return {
      isInitialized: false,
      error: errorMessage(err, 'Failed to initialize Sentry'),
    };
  }
}

function applyErrorReportingSetting(errorReportingEnabled: boolean) {
  if (errorReportingEnabled && SENTRY_DSN) {
    publishSentryStatus(initSentry());
  } else {
    console.log('Sentry is disabled or no DSN provided');
    publishSentryStatus(SENTRY_OFF);
  }
}

export function SentryProvider({ children }: { children: React.ReactNode }) {
  const { config, loading } = useConfig();
  const errorReportingEnabled = config?.telemetry?.error_reporting ?? false;
  const status = useSyncExternalStore(
    subscribeToSentryStatus,
    readSentryStatus
  );

  useEffect(() => {
    if (!loading) {
      applyErrorReportingSetting(errorReportingEnabled);
    }
  }, [errorReportingEnabled, loading]);

  return (
    <SentryContext.Provider value={status}>{children}</SentryContext.Provider>
  );
}
