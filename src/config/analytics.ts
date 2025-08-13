export const ANALYTICS_CONFIG = {
  // Aptabase app key - injected from environment variables during build
  APTABASE_APP_KEY: import.meta.env.VITE_APTABASE_APP_KEY || '',

  // App version - injected from package.json during build
  APP_VERSION: import.meta.env.VITE_APP_VERSION || 'unknown',

  BUILD_MODE: import.meta.env.MODE || 'development',
} as const;

export const validateAnalyticsConfig = () => {
  if (!ANALYTICS_CONFIG.APTABASE_APP_KEY) {
    console.warn(
      'Analytics: APTABASE_APP_KEY not found in environment variables'
    );
    return false;
  }

  return true;
};
