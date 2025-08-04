import { AptabaseProvider, useAptabase } from '@aptabase/react';
import { useCallback } from 'react';
import { ANALYTICS_CONFIG } from '../config/analytics';

// Export the app key from config
export const APTABASE_APP_KEY = ANALYTICS_CONFIG.APTABASE_APP_KEY;
export const APP_VERSION = ANALYTICS_CONFIG.APP_VERSION;

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
      console.log(`Analytics: Page viewed - ${pageName}`);
      return true;
    }
    console.log(`Analytics: Duplicate page view ignored - ${pageName}`);
    return false;
  }
}

// Hook for easy access to analytics
export const useAnalytics = () => {
  const { trackEvent } = useAptabase();

  // Check if analytics are enabled and configured
  // TODO: instead of true, we must check user configuration from the backend (where we store the user's preferences)
  const isAnalyticsEnabled = ANALYTICS_CONFIG.APTABASE_APP_KEY && true;

  // Initialize the analytics service when the hook is first used
  const analyticsService = AnalyticsService.getInstance();
  analyticsService.initialize();

  const trackPageView = useCallback(
    (pageName: string) => {
      if (!isAnalyticsEnabled) {
        console.log('Analytics: Disabled or not configured');
        return;
      }

      console.log(`Analytics: Attempting to track page view - ${pageName}`);
      const wasTracked = analyticsService.trackPageView(pageName);
      if (wasTracked) {
        console.log(
          `Analytics: Sending page_viewed event to Aptabase - ${pageName}`
        );
        trackEvent('page_viewed', {
          page: pageName,
          version: ANALYTICS_CONFIG.APP_VERSION,
        });
      } else {
        console.log(`Analytics: Page view not tracked - ${pageName}`);
      }
    },
    [trackEvent, analyticsService, isAnalyticsEnabled]
  );

  return {
    trackPageView,
  };
};
