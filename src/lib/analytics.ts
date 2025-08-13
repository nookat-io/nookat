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

export class AnalyticsService {
  private static instance: AnalyticsService;
  private isInitialized = false;
  private lastPageView = '';

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  trackPageView(pageName: string) {
    if (!this.isInitialized) {
      console.log('Analytics: Service not initialized');
      return false;
    }

    if (this.lastPageView !== pageName) {
      this.lastPageView = pageName;
      return true;
    }
    return false;
  }
}

// Hook for easy access to analytics
export const useAnalytics = () => {
  const { trackEvent } = useAptabase();

  // Initialize the analytics service when the hook is first used
  const analyticsService = AnalyticsService.getInstance();
  analyticsService.initialize();

  const trackPageView = useCallback(
    async (pageName: string) => {
      // Check if analytics are enabled based on user settings
      const configService = ConfigService.getInstance();
      const isUserAnalyticsEnabled = await configService.isAnalyticsEnabled();

      // Check if analytics are enabled by environment and user settings
      const isAnalyticsEnabled =
        ANALYTICS_CONFIG.APTABASE_APP_KEY && isUserAnalyticsEnabled;

      if (!isAnalyticsEnabled) {
        // Analytics are disabled, do nothing
        return;
      }

      const wasTracked = analyticsService.trackPageView(pageName);
      if (wasTracked) {
        trackEvent('page_viewed', {
          page: pageName,
          version: ANALYTICS_CONFIG.APP_VERSION,
        });
      }
    },
    [trackEvent, analyticsService]
  );

  return {
    trackPageView,
  };
};
