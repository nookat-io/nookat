import { useContext } from 'react';
import { SentryContext } from '../contexts/sentry-context';

export function useSentryContext() {
  const context = useContext(SentryContext);
  if (context === undefined) {
    throw new Error('useSentryContext must be used within a SentryProvider');
  }
  return context;
}
