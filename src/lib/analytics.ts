import { AptabaseProvider, useAptabase } from '@aptabase/react';
import { useCallback } from 'react';
import { ANALYTICS_CONFIG } from '../config/analytics';
import { ConfigService } from './config';

export const APTABASE_APP_KEY = ANALYTICS_CONFIG.APTABASE_APP_KEY;
export const APP_VERSION = ANALYTICS_CONFIG.APP_VERSION;

export function isAptabaseReleaseEnabled(): boolean {
  return ANALYTICS_CONFIG.BUILD_MODE !== 'development';
}

export { AptabaseProvider, useAptabase };

let lastViewedPage = '';

function isNewPageView(pageName: string): boolean {
  if (lastViewedPage === pageName) {
    return false;
  }
  lastViewedPage = pageName;
  return true;
}

async function isAnalyticsEnabled(): Promise<boolean> {
  const userAllowsUsageData =
    await ConfigService.getInstance().isAnalyticsEnabled();
  return Boolean(ANALYTICS_CONFIG.APTABASE_APP_KEY) && userAllowsUsageData;
}

export const useAnalytics = () => {
  const { trackEvent } = useAptabase();

  const trackPageView = useCallback(
    async (pageName: string) => {
      if (!(await isAnalyticsEnabled())) {
        return;
      }

      if (isNewPageView(pageName)) {
        trackEvent('page_viewed', {
          page: pageName,
          version: ANALYTICS_CONFIG.APP_VERSION,
        });
      }
    },
    [trackEvent]
  );

  return {
    trackPageView,
  };
};
