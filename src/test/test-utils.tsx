import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '../lib/theme-provider';
import { BrowserRouter } from 'react-router-dom';

// Mock Tauri API
jest.mock('@tauri-apps/api', () => ({
  invoke: jest.fn(),
  event: {
    listen: jest.fn(),
    emit: jest.fn(),
  },
  app: {
    getVersion: jest.fn(() => Promise.resolve('0.1.0')),
  },
}));

// Mock Sentry to avoid Vite import.meta issues
jest.mock('../lib/sentry-provider', () => ({
  SentryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sentry-provider">{children}</div>
  ),
}));

// Mock use-config hook to avoid complex dependencies
jest.mock('../hooks/use-config', () => ({
  useConfig: () => ({
    config: { theme: 'light' },
    loading: false,
    error: null,
    updateTheme: jest.fn(),
  }),
}));

// Create the providers wrapper component
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <BrowserRouter>{children}</BrowserRouter>
    </ThemeProvider>
  );
};

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Export our custom render function
export { customRender as render };

// Custom matchers
export const waitForElementToBeRemoved = async (element: Element | null) => {
  if (!element) return;

  await new Promise<void>(resolve => {
    const observer = new MutationObserver(() => {
      if (!document.contains(element)) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
};

// Test data factories
export const createMockContainer = (overrides = {}) => ({
  id: 'test-container-id',
  name: 'test-container',
  image: 'test-image:latest',
  status: 'running',
  created: new Date().toISOString(),
  ports: [],
  mounts: [],
  networks: [],
  ...overrides,
});

export const createMockImage = (overrides = {}) => ({
  id: 'test-image-id',
  repository: 'test-repository',
  tag: 'latest',
  size: 1024 * 1024 * 100, // 100MB
  created: new Date().toISOString(),
  ...overrides,
});

export const createMockNetwork = (overrides = {}) => ({
  id: 'test-network-id',
  name: 'test-network',
  driver: 'bridge',
  scope: 'local',
  ipam: {
    config: [
      {
        subnet: '172.18.0.0/16',
        gateway: '172.18.0.1',
      },
    ],
  },
  ...overrides,
});

export const createMockVolume = (overrides = {}) => ({
  name: 'test-volume',
  driver: 'local',
  mountpoint: '/var/lib/docker/volumes/test-volume/_data',
  status: {},
  labels: {},
  scope: 'local',
  ...overrides,
});
