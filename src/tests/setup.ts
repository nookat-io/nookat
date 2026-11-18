import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { clearMocks } from '@tauri-apps/api/mocks';
import { afterEach } from 'vitest';

class ResizeObserverWithoutLayout implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverWithoutLayout;
Element.prototype.scrollIntoView ??= function scrollIntoViewWithoutLayout() {};

const letUnmountedListenersUnsubscribe = () =>
  new Promise(resolve => setTimeout(resolve, 0));

afterEach(async () => {
  cleanup();
  await letUnmountedListenersUnsubscribe();
  clearMocks();
});
