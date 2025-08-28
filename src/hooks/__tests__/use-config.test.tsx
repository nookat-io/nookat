import { renderHook, act, waitFor } from '@testing-library/react';
import { useConfig } from '../use-config';
import { ConfigService } from '../../lib/config';
import { Theme, Language } from '../../types/config';

// Mock the ConfigService
jest.mock('../../lib/config', () => ({
  ConfigService: {
    getInstance: jest.fn(),
  },
}));

const mockConfigService = {
  subscribe: jest.fn(),
  loadConfig: jest.fn(),
  updateTheme: jest.fn(),
  updateLanguage: jest.fn(),
  updateTelemetrySettings: jest.fn(),
  updateStartupSettings: jest.fn(),
};

describe('useConfig hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ConfigService.getInstance as jest.Mock).mockReturnValue(mockConfigService);

    // Set up default mock implementations
    mockConfigService.subscribe.mockReturnValue(jest.fn());
    mockConfigService.loadConfig.mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('initializes with loading state', () => {
      const { result } = renderHook(() => useConfig());

      expect(result.current.loading).toBe(true);
      expect(result.current.config).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('subscribes to config changes on mount', () => {
      renderHook(() => useConfig());

      expect(mockConfigService.subscribe).toHaveBeenCalledTimes(1);
    });

    it('loads config on mount if not already loaded', () => {
      renderHook(() => useConfig());

      expect(mockConfigService.loadConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('config loading', () => {
    it('updates state when config is loaded successfully', async () => {
      const mockConfig = {
        theme: Theme.Dark,
        language: Language.English,
        telemetry: { send_anonymous_usage_data: true, error_reporting: true },
        startup: {
          start_on_system_startup: false,
          minimize_to_tray: false,
          check_for_updates: true,
          auto_update_settings: false,
        },
        sidebar_collapsed: false,
      };

      let subscribeCallback: (config: typeof mockConfig) => void;
      mockConfigService.subscribe.mockImplementation(callback => {
        subscribeCallback = callback;
        return jest.fn(); // unsubscribe function
      });

      const { result } = renderHook(() => useConfig());

      // Simulate config update
      act(() => {
        subscribeCallback(mockConfig);
      });

      await waitFor(() => {
        expect(result.current.config).toEqual(mockConfig);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
      });
    });

    it('handles config loading error', async () => {
      const errorMessage = 'Failed to load config';
      mockConfigService.loadConfig.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.loading).toBe(false);
        expect(result.current.config).toBe(null);
      });
    });

    it('handles non-Error exceptions', async () => {
      mockConfigService.loadConfig.mockRejectedValue('String error');

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load configuration');
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('updateTheme', () => {
    it('updates theme successfully', async () => {
      const newTheme: Theme = Theme.Light;
      mockConfigService.updateTheme.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      await act(async () => {
        await result.current.updateTheme(newTheme);
      });

      expect(mockConfigService.updateTheme).toHaveBeenCalledWith(newTheme);
      expect(result.current.error).toBe(null);
    });

    it('handles theme update error', async () => {
      const errorMessage = 'Failed to update theme';
      mockConfigService.updateTheme.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      // The hook should handle the error internally, not rethrow it
      await act(async () => {
        try {
          await result.current.updateTheme(Theme.Light);
        } catch {
          // Expected to catch the error
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('handles non-Error theme update exceptions', async () => {
      mockConfigService.updateTheme.mockRejectedValue('String error');

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      // The hook should handle the error internally, not rethrow it
      await act(async () => {
        try {
          await result.current.updateTheme(Theme.Light);
        } catch {
          // Expected to catch the error
        }
      });

      expect(result.current.error).toBe('Failed to update theme');
    });
  });

  describe('updateLanguage', () => {
    it('updates language successfully', async () => {
      const newLanguage: Language = Language.Russian;
      mockConfigService.updateLanguage.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      await act(async () => {
        await result.current.updateLanguage(newLanguage);
      });

      expect(mockConfigService.updateLanguage).toHaveBeenCalledWith(
        newLanguage
      );
      expect(result.current.error).toBe(null);
    });

    it('handles language update error', async () => {
      const errorMessage = 'Failed to update language';
      mockConfigService.updateLanguage.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      // The hook should handle the error internally, not rethrow it
      await act(async () => {
        try {
          await result.current.updateLanguage(Language.Russian);
        } catch {
          // Expected to catch the error
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('handles non-Error language update exceptions', async () => {
      mockConfigService.updateLanguage.mockRejectedValue('String error');

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      // The hook should handle the error internally, not rethrow it
      await act(async () => {
        try {
          await result.current.updateLanguage(Language.Russian);
        } catch {
          // Expected to catch the error
        }
      });

      expect(result.current.error).toBe('Failed to update language');
    });
  });

  describe('updateTelemetrySettings', () => {
    it('updates telemetry settings successfully', async () => {
      const newSettings = {
        send_anonymous_usage_data: false,
        error_reporting: true,
      };
      mockConfigService.updateTelemetrySettings.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      await act(async () => {
        await result.current.updateTelemetrySettings(newSettings);
      });

      expect(mockConfigService.updateTelemetrySettings).toHaveBeenCalledWith(
        newSettings
      );
      expect(result.current.error).toBe(null);
    });

    it('handles telemetry settings update error', async () => {
      const errorMessage = 'Failed to update telemetry settings';
      mockConfigService.updateTelemetrySettings.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      // The hook should handle the error internally, not rethrow it
      await act(async () => {
        try {
          await result.current.updateTelemetrySettings({
            send_anonymous_usage_data: false,
            error_reporting: true,
          });
        } catch {
          // Expected to catch the error
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('handles non-Error telemetry settings update exceptions', async () => {
      mockConfigService.updateTelemetrySettings.mockRejectedValue(
        'String error'
      );

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      // The hook should handle the error internally, not rethrow it
      await act(async () => {
        try {
          await result.current.updateTelemetrySettings({
            send_anonymous_usage_data: false,
            error_reporting: true,
          });
        } catch {
          // Expected to catch the error
        }
      });

      expect(result.current.error).toBe('Failed to update telemetry settings');
    });
  });

  describe('updateStartupSettings', () => {
    it('updates startup settings successfully', async () => {
      const newSettings = {
        start_on_system_startup: true,
        minimize_to_tray: false,
        check_for_updates: true,
        auto_update_settings: false,
      };
      mockConfigService.updateStartupSettings.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      await act(async () => {
        await result.current.updateStartupSettings(newSettings);
      });

      expect(mockConfigService.updateStartupSettings).toHaveBeenCalledWith(
        newSettings
      );
      expect(result.current.error).toBe(null);
    });

    it('handles startup settings update error', async () => {
      const errorMessage = 'Failed to update startup settings';
      mockConfigService.updateStartupSettings.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      // The hook should handle the error internally, not rethrow it
      await act(async () => {
        try {
          await result.current.updateStartupSettings({
            start_on_system_startup: true,
            minimize_to_tray: false,
            check_for_updates: true,
            auto_update_settings: false,
          });
        } catch {
          // Expected to catch the error
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('handles non-Error startup settings update exceptions', async () => {
      mockConfigService.updateStartupSettings.mockRejectedValue('String error');

      const { result } = renderHook(() => useConfig());

      // Wait for initial config loading to complete
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      // The hook should handle the error internally, not rethrow it
      await act(async () => {
        try {
          await result.current.updateStartupSettings({
            start_on_system_startup: true,
            minimize_to_tray: false,
            check_for_updates: true,
            auto_update_settings: false,
          });
        } catch {
          // Expected to catch the error
        }
      });

      expect(result.current.error).toBe('Failed to update startup settings');
    });
  });

  describe('cleanup', () => {
    it('unsubscribes from config changes on unmount', () => {
      const unsubscribeMock = jest.fn();
      mockConfigService.subscribe.mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useConfig());

      unmount();

      expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('error clearing', () => {
    it('clears error when starting new operations', async () => {
      // Set up initial error state
      mockConfigService.loadConfig.mockRejectedValue('Initial error');

      const { result } = renderHook(() => useConfig());

      // Wait for initial error
      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load configuration');
      });

      // Now test that error is cleared when starting new operations
      mockConfigService.updateTheme.mockResolvedValue(undefined);

      await act(async () => {
        await result.current.updateTheme(Theme.Light);
      });

      expect(result.current.error).toBe(null);
    });
  });
});
