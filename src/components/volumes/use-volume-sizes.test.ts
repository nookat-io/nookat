import { act, renderHook } from '@testing-library/react';
import { emit } from '@tauri-apps/api/event';
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIZES_REFRESH_MS, useVolumeSizes } from './use-volume-sizes';
import { VolumeSizes } from './volume-types';
import { MAIN_WINDOW_VISIBILITY_EVENT } from '../../hooks/use-main-window-visible';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

type Answer = VolumeSizes | null | Error;

function mockSizesBackend({ windowVisible = true } = {}) {
  const pendingAnswers: Array<(answer: Answer) => void> = [];
  mockWindows('main');
  mockIPC(
    cmd => {
      if (cmd === 'plugin:window|is_visible') return windowVisible;
      if (cmd !== 'get_volume_sizes') {
        throw new Error(`Unexpected command ${cmd}`);
      }
      return new Promise((resolve, reject) =>
        pendingAnswers.push(answer =>
          answer instanceof Error ? reject(answer) : resolve(answer)
        )
      );
    },
    { shouldMockEvents: true }
  );

  return {
    get requestCount() {
      return pendingAnswers.length;
    },
    answerRequest: (index: number, answer: Answer) =>
      act(async () => {
        pendingAnswers[index](answer);
        await vi.advanceTimersByTimeAsync(0);
      }),
    answerLatest: (answer: Answer) =>
      act(async () => {
        pendingAnswers[pendingAnswers.length - 1](answer);
        await vi.advanceTimersByTimeAsync(0);
      }),
  };
}

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));
const waitFor = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

const renderSizes = (names: string[]) =>
  renderHook(({ names }: { names: string[] }) => useVolumeSizes(names), {
    initialProps: { names },
  });

describe('useVolumeSizes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toast.error.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks the daemon once after mount and returns its sizes', async () => {
    const backend = mockSizesBackend();

    const { result } = renderSizes(['data']);
    await settle();
    await backend.answerLatest({ data: 52428800 });

    expect(backend.requestCount).toBe(1);
    expect(result.current).toEqual({ data: 52428800 });
  });

  it('asks again a minute after the previous answer', async () => {
    const backend = mockSizesBackend();
    const { result } = renderSizes(['data']);
    await settle();
    await backend.answerLatest({ data: 1 });

    await waitFor(SIZES_REFRESH_MS - 1);
    expect(backend.requestCount).toBe(1);
    await waitFor(1);
    expect(backend.requestCount).toBe(2);
    await backend.answerLatest({ data: 2 });

    expect(result.current).toEqual({ data: 2 });
  });

  it('waits for a slow request to finish before it starts the next minute', async () => {
    const backend = mockSizesBackend();
    renderSizes(['data']);
    await settle();

    await waitFor(SIZES_REFRESH_MS * 3);
    expect(backend.requestCount).toBe(1);

    await backend.answerLatest({ data: 1 });
    await waitFor(SIZES_REFRESH_MS);
    expect(backend.requestCount).toBe(2);
  });

  it('asks again when a volume is added, but not for the same names in a new array', async () => {
    const backend = mockSizesBackend();
    const { rerender } = renderSizes(['data', 'cache']);
    await settle();
    await backend.answerLatest({ data: 1 });

    rerender({ names: ['cache', 'data'] });
    await settle();
    expect(backend.requestCount).toBe(1);

    rerender({ names: ['cache', 'data', 'logs'] });
    await settle();
    expect(backend.requestCount).toBe(2);
  });

  it('ignores an answer for names that have changed since it was asked', async () => {
    const backend = mockSizesBackend();
    const { result, rerender } = renderSizes(['data']);
    await settle();

    rerender({ names: ['data', 'logs'] });
    await settle();
    await backend.answerRequest(1, { data: 2, logs: 3 });
    await backend.answerRequest(0, { data: 1 });

    expect(result.current).toEqual({ data: 2, logs: 3 });
  });

  it('does not ask while there are no volumes', async () => {
    const backend = mockSizesBackend();

    renderSizes([]);
    await waitFor(SIZES_REFRESH_MS * 3);

    expect(backend.requestCount).toBe(0);
  });

  it('stops asking after unmount, even when the last answer arrives later', async () => {
    const backend = mockSizesBackend();
    const { unmount } = renderSizes(['data']);
    await settle();

    unmount();
    await backend.answerLatest({ data: 1 });
    await waitFor(SIZES_REFRESH_MS * 3);

    expect(backend.requestCount).toBe(1);
  });

  it('keeps the sizes it has when a request fails, without a toast, and asks again a minute later', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const backend = mockSizesBackend();
    const { result } = renderSizes(['data']);
    await settle();
    await backend.answerLatest({ data: 1 });

    await waitFor(SIZES_REFRESH_MS);
    await backend.answerLatest(new Error('df failed'));

    expect(result.current).toEqual({ data: 1 });
    expect(consoleError).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();

    await waitFor(SIZES_REFRESH_MS);
    expect(backend.requestCount).toBe(3);
  });

  it('stops asking an engine that cannot report sizes until the volumes change', async () => {
    const backend = mockSizesBackend();
    const { result, rerender } = renderSizes(['data']);
    await settle();
    await backend.answerLatest(null);

    await waitFor(SIZES_REFRESH_MS * 3);
    expect(backend.requestCount).toBe(1);
    expect(result.current).toEqual({});

    rerender({ names: ['data', 'logs'] });
    await settle();
    expect(backend.requestCount).toBe(2);
  });

  it('pauses while the window is hidden and asks once when it is shown again', async () => {
    const backend = mockSizesBackend();
    renderSizes(['data']);
    await settle();
    await backend.answerLatest({ data: 1 });

    await act(() => emit(MAIN_WINDOW_VISIBILITY_EVENT, false));
    await waitFor(SIZES_REFRESH_MS * 3);
    expect(backend.requestCount).toBe(1);

    await act(() => emit(MAIN_WINDOW_VISIBILITY_EVENT, true));
    await settle();
    expect(backend.requestCount).toBe(2);
  });

  it('does not ask when it mounts while the window is hidden, until the window is shown', async () => {
    const backend = mockSizesBackend({ windowVisible: false });

    renderSizes(['data']);
    await waitFor(SIZES_REFRESH_MS * 3);
    expect(backend.requestCount).toBe(0);

    await act(() => emit(MAIN_WINDOW_VISIBILITY_EVENT, true));
    await settle();
    expect(backend.requestCount).toBe(1);
  });
});
