import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { VolumesTable } from './volumes-table';
import { Volume, VolumeScope, VolumeSizes } from './volume-types';

const volumeNamed = (name: string): Volume => ({
  name,
  driver: 'local',
  mountpoint: `/var/lib/docker/volumes/${name}/_data`,
  labels: {},
  scope: VolumeScope.Local,
  options: {},
  in_use: false,
});

const renderTable = (names: string[], sizes: VolumeSizes) =>
  render(
    <VolumesTable
      selectedVolumes={[]}
      onSelectionChange={() => {}}
      volumes={names.map(volumeNamed)}
      sizes={sizes}
      emptyState={null}
    />
  );

const rowOf = (name: string) =>
  screen.getByRole('cell', { name }).closest('tr') as HTMLElement;

const volumeNamesInOrder = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map(row => within(row).getAllByRole('cell')[1].textContent);

describe('VolumesTable sizes', () => {
  const sizes = { alpha: 52428800, beta: 2048 };

  it('shows the size the daemon measured, and a dash when it did not', () => {
    renderTable(['alpha', 'beta', 'gamma'], sizes);

    expect(within(rowOf('alpha')).getByText('50 MB')).toBeInTheDocument();
    expect(within(rowOf('beta')).getByText('2 KB')).toBeInTheDocument();
    expect(within(rowOf('gamma')).getByText('-')).toBeInTheDocument();
  });

  it('sorts by size with unmeasured volumes last', async () => {
    const user = userEvent.setup();
    renderTable(['alpha', 'beta', 'gamma'], sizes);

    await user.click(screen.getByRole('columnheader', { name: 'Size' }));

    expect(volumeNamesInOrder()).toEqual(['beta', 'alpha', 'gamma']);
  });

  it('shows a dash for an unmeasured volume named like an object property', async () => {
    const user = userEvent.setup();
    renderTable(['constructor', 'beta'], sizes);

    expect(within(rowOf('constructor')).getByText('-')).toBeInTheDocument();

    await user.click(screen.getByRole('columnheader', { name: 'Size' }));
    expect(volumeNamesInOrder()).toEqual(['beta', 'constructor']);
  });
});
