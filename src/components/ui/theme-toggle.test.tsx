import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeContext } from '../../contexts/theme-context';
import { Theme } from '../../types/config';
import { ThemeToggle } from './theme-toggle';

const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

function renderToggle(updateTheme: (theme: Theme) => Promise<void>) {
  render(
    <ThemeContext.Provider
      value={{ theme: Theme.Dark, loading: false, error: null, updateTheme }}
    >
      <ThemeToggle />
    </ThemeContext.Provider>
  );
}

async function pickTheme(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
  await user.click(await screen.findByRole('menuitem', { name }));
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('saves the picked theme', async () => {
    const updateTheme = vi.fn(async () => {});
    renderToggle(updateTheme);

    await pickTheme('Light');

    expect(updateTheme).toHaveBeenCalledWith(Theme.Light);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('tells the user why the theme could not be saved', async () => {
    renderToggle(() => Promise.reject('Failed to write config file: denied'));

    await pickTheme('System');

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to change the theme: Failed to write config file: denied'
    );
  });
});
