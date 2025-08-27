import { renderHook, act } from '@testing-library/react';
import { useThemeContext } from '../use-theme-context';
import { ThemeProvider } from '../../lib/theme-provider';
import { Theme } from '../../types/config';

// Create a mock that can track theme changes
const mockUpdateTheme = jest.fn();
let mockTheme = Theme.Light;

jest.mock('../../hooks/use-config', () => ({
  useConfig: () => ({
    config: { theme: mockTheme },
    loading: false,
    error: null,
    updateTheme: mockUpdateTheme.mockImplementation(newTheme => {
      mockTheme = newTheme;
    }),
  }),
}));

describe('useThemeContext', () => {
  beforeEach(() => {
    mockTheme = Theme.Light;
    mockUpdateTheme.mockClear();
  });

  it('should throw error when used outside ThemeProvider', () => {
    // This test expects an error to be thrown
    expect(() => {
      renderHook(() => useThemeContext());
    }).toThrow('useThemeContext must be used within a ThemeProvider');
  });

  it('should return theme context when used within ThemeProvider', () => {
    const { result } = renderHook(() => useThemeContext(), {
      wrapper: ThemeProvider,
    });

    expect(result.current).toBeDefined();
    expect(result.current.theme).toBeDefined();
    expect(typeof result.current.updateTheme).toBe('function');
  });

  it('should allow theme changes', () => {
    const { result } = renderHook(() => useThemeContext(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.updateTheme(Theme.Dark);
    });

    // The mock should have been called
    expect(mockUpdateTheme).toHaveBeenCalledWith(Theme.Dark);
  });

  it('should toggle between light and dark themes', () => {
    const { result } = renderHook(() => useThemeContext(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.updateTheme(Theme.Light);
    });
    expect(mockUpdateTheme).toHaveBeenCalledWith(Theme.Light);

    act(() => {
      result.current.updateTheme(Theme.Dark);
    });
    expect(mockUpdateTheme).toHaveBeenCalledWith(Theme.Dark);

    act(() => {
      result.current.updateTheme(Theme.System);
    });
    expect(mockUpdateTheme).toHaveBeenCalledWith(Theme.System);
  });
});
