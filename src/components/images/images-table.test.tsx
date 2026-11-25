import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ImagesTable } from './images-table';
import { Image } from './image-types';

const webImage: Image = {
  id: 'bbb',
  repository: 'web',
  tag: 'latest',
  image_id: 'bbb',
  created: 1_700_000_000,
  size: 1024,
  in_use: true,
  dangling: false,
};

function onlyCellSpan() {
  const body = screen.getAllByRole('rowgroup')[1];
  const cells = within(body).getAllByRole('cell');
  expect(cells).toHaveLength(1);
  return (cells[0] as HTMLTableCellElement).colSpan;
}

it('spans the loading row across every header column', () => {
  render(
    <ImagesTable
      selectedImages={[]}
      onSelectionChange={() => {}}
      images={[]}
      isLoading
      emptyState={null}
    />
  );

  expect(screen.getAllByRole('columnheader')).toHaveLength(7);
  expect(onlyCellSpan()).toBe(7);
});

it('spans the error row across every header column', () => {
  render(
    <ImagesTable
      selectedImages={[]}
      onSelectionChange={() => {}}
      images={[]}
      error="Docker not found"
      emptyState={null}
    />
  );

  expect(screen.getAllByRole('columnheader')).toHaveLength(7);
  expect(onlyCellSpan()).toBe(7);
});

it('describes deleting an image in use with valid HTML', async () => {
  const user = userEvent.setup();
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <ImagesTable
      selectedImages={[]}
      onSelectionChange={() => {}}
      images={[webImage]}
      emptyState={null}
    />
  );

  const row = screen.getByRole('row', { name: /web/ });
  await user.click(within(row).getByRole('button'));
  await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

  const dialog = screen.getByRole('dialog', { name: 'Confirm Delete Image' });
  expect(dialog).toHaveAccessibleDescription(
    expect.stringContaining(
      'Are you sure you want to delete the image web:latest?'
    )
  );
  expect(dialog).toHaveAccessibleDescription(
    expect.stringContaining(
      'Warning: This image is currently in use by containers.'
    )
  );
  expect(dialog.querySelectorAll('p div, p p')).toHaveLength(0);
  expect(consoleError).not.toHaveBeenCalled();
});
