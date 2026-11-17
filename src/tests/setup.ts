import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { clearMocks } from '@tauri-apps/api/mocks';
import { afterEach } from 'vitest';

afterEach(() => {
  // Testing Library only cleans up on its own when test globals are enabled.
  cleanup();
  // Drop any Tauri IPC, window and event mocks a test installed.
  clearMocks();
});
