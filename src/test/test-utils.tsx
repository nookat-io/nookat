/* eslint-disable react-refresh/only-export-components */
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '../lib/theme-provider';

// Mock SentryProvider and EngineProvider to avoid import.meta issues
const SentryProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="sentry-provider">{children}</div>
);

const EngineProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="engine-provider">{children}</div>
);

// Mock Tauri API
jest.mock('@tauri-apps/api', () => ({
  invoke: jest.fn(),
  app: {
    getVersion: jest.fn(() => Promise.resolve('1.0.0')),
    getName: jest.fn(() => Promise.resolve('Nookat')),
  },
  event: {
    emit: jest.fn(),
    listen: jest.fn(),
  },
}));

// Mock Sentry
jest.mock('@sentry/react', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
}));

// Mock Aptabase
jest.mock('@aptabase/react', () => ({
  useAptabase: () => ({
    track: jest.fn(),
    setUserIdentity: jest.fn(),
    setUserProperty: jest.fn(),
  }),
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  useParams: () => ({}),
}));

// Custom render function that includes all necessary providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withTheme?: boolean;
  withSentry?: boolean;
  withEngine?: boolean;
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SentryProvider>
      <ThemeProvider>
        <EngineProvider>{children}</EngineProvider>
      </ThemeProvider>
    </SentryProvider>
  );
};

const ThemeOnlyProvider = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider>{children}</ThemeProvider>;
};

export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    withTheme = true,
    withSentry = false,
    withEngine = false,
    ...renderOptions
  } = options;

  let Wrapper: React.ComponentType<{ children: React.ReactNode }>;

  if (withEngine && withSentry) {
    Wrapper = AllTheProviders;
  } else if (withTheme) {
    Wrapper = ThemeOnlyProvider;
  } else {
    Wrapper = ({ children }) => <>{children}</>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything from testing library
export * from '@testing-library/react';

// Custom matchers for common assertions
export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveText = (element: HTMLElement, text: string) => {
  expect(element).toHaveTextContent(text);
};

export const expectElementToHaveClass = (
  element: HTMLElement,
  className: string
) => {
  expect(element).toHaveClass(className);
};

// Mock data factories
export const createMockContainer = (overrides = {}) => ({
  id: 'test-container-1',
  name: 'test-container',
  image: 'test-image:latest',
  status: 'running',
  state: 'running',
  created: new Date().toISOString(),
  ports: [],
  mounts: [],
  networks: [],
  ...overrides,
});

export const createMockImage = (overrides = {}) => ({
  id: 'test-image-1',
  repository: 'test-repository',
  tag: 'latest',
  size: 1024 * 1024 * 100, // 100MB
  created: new Date().toISOString(),
  ...overrides,
});

export const createMockNetwork = (overrides = {}) => ({
  id: 'test-network-1',
  name: 'test-network',
  driver: 'bridge',
  scope: 'local',
  ipam: {
    config: [{ subnet: '172.18.0.0/16' }],
  },
  ...overrides,
});

export const createMockVolume = (overrides = {}) => ({
  name: 'test-volume-1',
  driver: 'local',
  mountpoint: '/var/lib/docker/volumes/test-volume-1/_data',
  size: 1024 * 1024 * 50, // 50MB
  ...overrides,
});

// Mock engine state
export const createMockEngineState = (overrides = {}) => ({
  isRunning: true,
  version: '24.0.0',
  apiVersion: '1.45',
  os: 'linux',
  arch: 'x86_64',
  kernelVersion: '5.15.0',
  ...overrides,
});

// Mock engine status
export const createMockEngineStatus = (overrides = {}) => ({
  status: 'running',
  message: 'Docker is running',
  lastCheck: new Date().toISOString(),
  ...overrides,
});

// Utility functions for common test operations
export const waitForElementToBeRemoved = (element: HTMLElement) => {
  return new Promise<void>(resolve => {
    const observer = new MutationObserver(() => {
      if (!document.contains(element)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
};

export const mockConsoleError = () => {
  const originalError = console.error;
  const mockError = jest.fn();
  console.error = mockError;
  return {
    mockError,
    restore: () => {
      console.error = originalError;
    },
  };
};

export const mockConsoleWarn = () => {
  const originalWarn = console.warn;
  const mockWarn = jest.fn();
  console.warn = mockWarn;
  return {
    mockWarn,
    restore: () => {
      console.warn = originalWarn;
    },
  };
};
