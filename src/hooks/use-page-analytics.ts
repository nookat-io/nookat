import { useEffect, useCallback } from 'react';
import { useAnalytics } from '../lib/analytics';

export const usePageAnalytics = (pageName: string) => {
  const { trackPageView } = useAnalytics();

  const trackPageAnalytics = useCallback(() => {
    console.log(`Analytics: Page analytics hook called for - ${pageName}`);
    trackPageView(pageName);
  }, [trackPageView, pageName]);

  useEffect(() => {
    console.log(`Analytics: Page analytics effect triggered for - ${pageName}`);
    trackPageAnalytics();
  }, [trackPageAnalytics]);
};
