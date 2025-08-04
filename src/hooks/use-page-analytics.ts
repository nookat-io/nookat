import { useEffect, useCallback } from 'react';
import { useAnalytics } from '../lib/analytics';

export const usePageAnalytics = (pageName: string) => {
  const { trackPageView } = useAnalytics();

  const trackPageAnalytics = useCallback(async () => {
    await trackPageView(pageName);
  }, [trackPageView, pageName]);

  useEffect(() => {
    trackPageAnalytics().catch(error => {
      console.error('Analytics: Error tracking page view:', error);
    });
  }, [trackPageAnalytics]);
};
