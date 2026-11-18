import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Dialog } from '../ui/dialog';
import { ConfirmDialog } from './ConfirmDialog';

it('describes the action with valid HTML so React reports no nesting errors', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  render(
    <Dialog open>
      <ConfirmDialog
        title="Delete volume?"
        description={<div>Its data cannot be recovered.</div>}
        onConfirm={() => {}}
      />
    </Dialog>
  );

  expect(
    screen.getByRole('dialog', { name: 'Delete volume?' })
  ).toHaveAccessibleDescription('Its data cannot be recovered.');
  expect(consoleError).not.toHaveBeenCalled();
});
