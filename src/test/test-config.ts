// Test configuration and environment variables
export const TEST_CONFIG = {
  // Test timeouts
  TIMEOUTS: {
    COMPONENT_RENDER: 1000,
    API_CALL: 5000,
    ANIMATION: 1000,
    LOADING: 3000,
  },

  // Test data
  TEST_DATA: {
    CONTAINER_ID: 'test-container-123',
    IMAGE_ID: 'test-image-456',
    NETWORK_ID: 'test-network-789',
    VOLUME_NAME: 'test-volume',
  },

  // Mock responses
  MOCK_RESPONSES: {
    CONTAINERS: [
      {
        id: 'test-container-123',
        name: 'test-container',
        image: 'test-image:latest',
        status: 'running',
        created: '2024-01-01T00:00:00Z',
        ports: [],
        mounts: [],
        networks: [],
      },
    ],
    IMAGES: [
      {
        id: 'test-image-456',
        repository: 'test-repository',
        tag: 'latest',
        size: 1024 * 1024 * 100,
        created: '2024-01-01T00:00:00Z',
      },
    ],
    NETWORKS: [
      {
        id: 'test-network-789',
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
      },
    ],
    VOLUMES: [
      {
        name: 'test-volume',
        driver: 'local',
        mountpoint: '/var/lib/docker/volumes/test-volume/_data',
        status: {},
        labels: {},
        scope: 'local',
      },
    ],
  },

  // Test selectors
  SELECTORS: {
    LOADING_SPINNER: '[data-testid="loading-spinner"]',
    ERROR_MESSAGE: '[data-testid="error-message"]',
    SUCCESS_MESSAGE: '[data-testid="success-message"]',
    CONTAINER_ROW: '[data-testid="container-row"]',
    IMAGE_ROW: '[data-testid="image-row"]',
    NETWORK_ROW: '[data-testid="network-row"]',
    VOLUME_ROW: '[data-testid="volume-row"]',
  },

  // Test URLs
  URLS: {
    HOME: '/',
    CONTAINERS: '/',
    IMAGES: '/images',
    NETWORKS: '/networks',
    VOLUMES: '/volumes',
    SETTINGS: '/settings',
  },
};

// Helper function to wait for loading states
export const waitForLoadingToComplete = async (
  timeout = TEST_CONFIG.TIMEOUTS.LOADING
) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

// Helper function to create test data
export function createTestData<T extends Record<string, unknown>>(
  baseData: T,
  overrides: Partial<T> = {}
): T {
  return { ...baseData, ...overrides };
}
