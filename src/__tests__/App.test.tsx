import { render, screen, waitFor } from '../test/test-utils';
import App from '../App';

// Mock the analytics hook to avoid side effects
jest.mock('../hooks/use-analytics', () => ({
  usePageAnalytics: jest.fn(),
}));

// Mock the engine error gate to avoid complex engine logic
jest.mock('../components/ui/engine-error', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="engine-error-gate">{children}</div>
  ),
}));

// Mock the analytics module to avoid Vite import.meta.env syntax
jest.mock('../lib/analytics', () => ({
  ANALYTICS_CONFIG: {
    APTABASE_APP_KEY: 'test-key',
    SENTRY_DSN: 'test-dsn',
  },
  isAptabaseReleaseEnabled: () => false,
  APTABASE_APP_KEY: 'test-key',
  APP_VERSION: '1.0.0',
  AptabaseProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="aptabase-provider">{children}</div>
  ),
}));

// Mock the config module to avoid complex dependencies
jest.mock('../lib/config', () => ({
  ConfigService: {
    getInstance: () => ({
      getConfig: jest.fn(() => ({ theme: 'light' })),
      updateConfig: jest.fn(),
    }),
  },
}));

// Mock the engine provider to avoid complex engine logic
jest.mock('../lib/engine-provider', () => ({
  EngineProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="engine-provider">{children}</div>
  ),
}));

// Mock the sentry provider to avoid Vite import.meta issues
jest.mock('../lib/sentry-provider', () => ({
  SentryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sentry-provider">{children}</div>
  ),
}));

// Mock the theme provider to avoid complex dependencies
jest.mock('../lib/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// Mock the theme context hook to avoid complex dependencies
jest.mock('../hooks/use-theme-context', () => ({
  useThemeContext: jest.fn(() => ({
    loading: false,
    theme: 'light',
    setTheme: jest.fn(),
  })),
}));

// Mock the layout components
jest.mock('../components/layout', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
  Header: () => <div data-testid="header">Header</div>,
}));

// Mock the loading spinner
jest.mock('../components/ui/loading-spinner', () => ({
  LoadingScreen: () => <div data-testid="loading-screen">Loading...</div>,
}));

// Mock the toaster component
jest.mock('../components/ui/sonner', () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

// Mock the page components to avoid complex dependencies
jest.mock('../pages/ContainersPage', () => ({
  __esModule: true,
  default: () => <div data-testid="containers-page">Containers Page</div>,
}));

jest.mock('../pages/ImagesPage', () => ({
  __esModule: true,
  default: () => <div data-testid="images-page">Images Page</div>,
}));

jest.mock('../pages/NetworksPage', () => ({
  __esModule: true,
  default: () => <div data-testid="networks-page">Networks Page</div>,
}));

jest.mock('../pages/VolumesPage', () => ({
  __esModule: true,
  default: () => <div data-testid="volumes-page">Volumes Page</div>,
}));

jest.mock('../pages/SettingsPage', () => ({
  __esModule: true,
  default: () => <div data-testid="settings-page">Settings Page</div>,
}));

describe('App Component', () => {
  it('renders without crashing', async () => {
    render(<App />);

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('aptabase-provider')).toBeInTheDocument();
    });
  });

  it('renders main navigation elements', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  it('renders containers page by default', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('containers-page')).toBeInTheDocument();
    });
  });

  it('renders loading screen initially', async () => {
    // Mock loading state by temporarily overriding the mock
    const mockUseThemeContext = jest.requireMock(
      '../hooks/use-theme-context'
    ).useThemeContext;
    mockUseThemeContext.mockReturnValueOnce({
      loading: true,
      theme: 'light',
      setTheme: jest.fn(),
    });

    render(<App />);

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
  });

  it('renders toaster component', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    render(<App />);

    await waitFor(() => {
      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
    });
  });

  it('renders with proper layout structure', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('containers-page')).toBeInTheDocument();
      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });
  });
});
