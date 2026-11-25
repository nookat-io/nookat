import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PruneResultsDialog } from './PruneResultsDialog';

it('describes a prune that removed images in one sentence', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  render(
    <PruneResultsDialog
      open
      result={{
        images_deleted: [{ id: 'sha256:0123456789abcdef', tags: [] }],
        space_reclaimed: 1024,
      }}
      onOpenChange={() => {}}
    />
  );

  const dialog = screen.getByRole('dialog', { name: 'Prune Results' });
  expect(dialog).toHaveAccessibleDescription('Prune completed successfully');
  expect(within(dialog).getByText('1 image removed')).toBeInTheDocument();
  expect(within(dialog).getByText('Removed images')).toBeInTheDocument();
  expect(within(dialog).getByText('0123456789ab')).toBeInTheDocument();
  expect(dialog.querySelectorAll('p div, p p')).toHaveLength(0);
  expect(consoleError).not.toHaveBeenCalled();
});

it('says when a prune removed nothing', () => {
  render(
    <PruneResultsDialog
      open
      result={{ images_deleted: [], space_reclaimed: 0 }}
      onOpenChange={() => {}}
    />
  );

  const dialog = screen.getByRole('dialog', { name: 'Prune Results' });
  expect(dialog).toHaveAccessibleDescription('No images were removed.');
  expect(within(dialog).queryByText(/0 removed/)).not.toBeInTheDocument();
  expect(within(dialog).queryByText(/reclaimed/)).not.toBeInTheDocument();
});
