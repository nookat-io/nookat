import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ContainerState } from '../components/containers/container-types';
import { Image } from '../components/images/image-types';
import { Network } from '../components/networks/network-types';
import { Volume } from '../components/volumes/volume-types';
import { useTableSort } from '../hooks/use-table-sort';
import { EngineProvider } from '../lib/engine-provider';
import { aContainer, recordCommands } from '../tests/containers';
import { EngineState } from '../types/engine-state';
import { useFilter } from '../utils/use-filter';
import ContainersPage from './ContainersPage';
import ImagesPage from './ImagesPage';
import NetworksPage from './NetworksPage';
import VolumesPage from './VolumesPage';

vi.mock('../hooks/use-analytics', () => ({ usePageAnalytics: () => {} }));

vi.mock('../utils/use-filter', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/use-filter')>();
  return { useFilter: vi.fn(actual.useFilter) };
});

vi.mock('../hooks/use-table-sort', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../hooks/use-table-sort')>();
  return { useTableSort: vi.fn(actual.useTableSort) };
});

const web = aContainer('web', ContainerState.Running);
const db = aContainer('db', ContainerState.Exited);

const postgres: Image = {
  id: 'postgres:16',
  repository: 'postgres',
  tag: '16',
  image_id: 'sha256:postgres',
  created: 1_700_000_000,
  size: 1024,
  in_use: false,
  dangling: false,
};

const pgdata: Volume = {
  name: 'pgdata',
  driver: 'local',
  mountpoint: '/var/lib/docker/volumes/pgdata/_data',
  labels: {},
  options: {},
  usage_data: { size: 0, ref_count: 0 },
};

const backend: Network = {
  id: 'backend-id',
  name: 'backend',
  driver: 'bridge',
  scope: 'local',
  in_use: false,
  internal: false,
  ipam: {},
};

const snapshot: EngineState = {
  containers: { [web.id]: web, [db.id]: db },
  images: { [postgres.id]: postgres },
  volumes: { [pgdata.name]: pgdata },
  networks: { [backend.id]: backend },
  engine_status: { Running: 'Docker' },
  version: 1,
  last_updated: '2026-01-01T00:00:00Z',
};

function mockEngine() {
  recordCommands(
    {
      engine_status: () => ({ Running: 'Docker' }),
      get_docker_info: () => ({}),
      start_engine_state_monitoring: () => null,
      get_engine_state: () => snapshot,
    },
    { shouldMockEvents: true }
  );
}

function lastDataPassedTo(hook: unknown) {
  const { calls } = vi.mocked(hook as (..._args: unknown[]) => unknown).mock;
  return calls[calls.length - 1][0];
}

const pages: { name: string; Page: ComponentType; rowName: string }[] = [
  { name: 'Containers', Page: ContainersPage, rowName: 'web' },
  { name: 'Networks', Page: NetworksPage, rowName: 'backend' },
  { name: 'Volumes', Page: VolumesPage, rowName: 'pgdata' },
  { name: 'Images', Page: ImagesPage, rowName: 'postgres' },
];

describe.each(pages)('$name page', ({ Page, rowName }) => {
  it('keeps the list it filters and sorts when only the selection changes', async () => {
    const user = userEvent.setup();
    mockEngine();
    render(
      <EngineProvider>
        <Page />
      </EngineProvider>
    );

    const row = (await screen.findAllByText(rowName))[0].closest('tr');
    const filtered = lastDataPassedTo(useFilter);
    const sorted = lastDataPassedTo(useTableSort);

    await user.click(within(row as HTMLElement).getByRole('checkbox'));

    expect(within(row as HTMLElement).getByRole('checkbox')).toBeChecked();
    expect(lastDataPassedTo(useFilter)).toBe(filtered);
    expect(lastDataPassedTo(useTableSort)).toBe(sorted);
  });
});
