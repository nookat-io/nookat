import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ContainerState } from '../components/containers/container-types';
import { Image } from '../components/images/image-types';
import { Network } from '../components/networks/network-types';
import { Volume } from '../components/volumes/volume-types';
import { EngineProvider } from '../lib/engine-provider';
import { aContainer, recordCommands } from '../tests/containers';
import { EngineState } from '../types/engine-state';
import ContainersPage from './ContainersPage';
import ImagesPage from './ImagesPage';
import NetworksPage from './NetworksPage';
import VolumesPage from './VolumesPage';

vi.mock('../hooks/use-analytics', () => ({ usePageAnalytics: () => {} }));

type Entities = Pick<
  EngineState,
  'containers' | 'images' | 'volumes' | 'networks'
>;

const noEntities: Entities = {
  containers: {},
  images: {},
  volumes: {},
  networks: {},
};

function snapshot(entities: Partial<Entities>): EngineState {
  return {
    ...noEntities,
    ...entities,
    engine_status: { Running: 'Docker' },
    version: 1,
    last_updated: '2026-01-01T00:00:00Z',
  };
}

function mockEngine(getEngineState: () => unknown) {
  recordCommands(
    {
      engine_status: () => ({ Running: 'Docker' }),
      get_docker_info: () => ({}),
      start_engine_state_monitoring: () => null,
      get_engine_state: getEngineState,
    },
    { shouldMockEvents: true }
  );
}

function renderPage(Page: ComponentType) {
  render(
    <EngineProvider>
      <Page />
    </EngineProvider>
  );
}

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

const bridge: Network = {
  id: 'bridge-id',
  name: 'bridge',
  driver: 'bridge',
  scope: 'local',
  in_use: false,
  internal: false,
  ipam: {},
};

interface PageCase {
  name: string;
  Page: ComponentType;
  emptyTitle: string;
  emptyDescription: string;
  item: Partial<Entities>;
  itemName: string;
  filterButton: string;
  noMatchesTitle: string;
  searchPlaceholder: string;
  showAll: string;
}

const pages: PageCase[] = [
  {
    name: 'Containers',
    Page: ContainersPage,
    emptyTitle: 'No containers yet',
    emptyDescription:
      'Create one with Create Container, or start one from a terminal with docker run or docker compose up.',
    item: { containers: { [db.id]: db } },
    itemName: 'db',
    filterButton: 'Running',
    noMatchesTitle: 'No running containers',
    searchPlaceholder: 'Search containers...',
    showAll: 'Show all containers',
  },
  {
    name: 'Images',
    Page: ImagesPage,
    emptyTitle: 'No images yet',
    emptyDescription:
      'Pull one with Pull Image. Images you pull or build from a terminal show up here too.',
    item: { images: { [postgres.id]: postgres } },
    itemName: 'postgres',
    filterButton: 'In Use',
    noMatchesTitle: 'No images in use',
    searchPlaceholder: 'Search images...',
    showAll: 'Show all images',
  },
  {
    name: 'Volumes',
    Page: VolumesPage,
    emptyTitle: 'No volumes yet',
    emptyDescription:
      'Volumes show up here once a container mounts one, or when you create one with docker volume create.',
    item: { volumes: { [pgdata.name]: pgdata } },
    itemName: 'pgdata',
    filterButton: 'In Use',
    noMatchesTitle: 'No volumes in use',
    searchPlaceholder: 'Search volumes...',
    showAll: 'Show all volumes',
  },
  {
    name: 'Networks',
    Page: NetworksPage,
    emptyTitle: 'No networks',
    emptyDescription: 'Create one with Create Network.',
    item: { networks: { [bridge.id]: bridge } },
    itemName: 'bridge',
    filterButton: 'Others',
    noMatchesTitle: 'No custom networks',
    searchPlaceholder: 'Search networks...',
    showAll: 'Show all networks',
  },
];

const selectAllCheckbox = () =>
  within(screen.getAllByRole('row')[0]).getByRole('checkbox');

describe('list page empty states', () => {
  it.each(pages)(
    'shows that nothing exists yet on each page: $name',
    async ({ Page, emptyTitle, emptyDescription, showAll }) => {
      mockEngine(() => snapshot({}));
      renderPage(Page);

      const title = await screen.findByText(emptyTitle);
      const cell = title.closest('td') as HTMLTableCellElement;

      expect(cell).toHaveTextContent(emptyDescription);
      expect(cell.colSpan).toBe(screen.getAllByRole('columnheader').length);
      expect(
        screen.queryByRole('button', { name: showAll })
      ).not.toBeInTheDocument();
      expect(selectAllCheckbox()).toBeDisabled();
    }
  );

  it.each(pages)(
    'tells a filter and a search that hide every item from an empty list: $name',
    async ({
      Page,
      item,
      itemName,
      emptyTitle,
      filterButton,
      noMatchesTitle,
      searchPlaceholder,
      showAll,
    }) => {
      const user = userEvent.setup();
      mockEngine(() => snapshot(item));
      renderPage(Page);
      await screen.findAllByText(itemName);

      await user.click(screen.getByRole('button', { name: filterButton }));
      expect(screen.getByText(noMatchesTitle)).toBeInTheDocument();
      expect(screen.queryByText(emptyTitle)).not.toBeInTheDocument();
      expect(selectAllCheckbox()).toBeDisabled();

      const search = screen.getByPlaceholderText(searchPlaceholder);
      await user.type(search, 'zzz');
      expect(
        screen.getByText(`${noMatchesTitle} match "zzz"`)
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: showAll }));
      expect(screen.getAllByText(itemName)).not.toHaveLength(0);
      expect(search).toHaveValue('');
    }
  );

  it('disables select all while only system networks are listed', async () => {
    mockEngine(() => snapshot({ networks: { [bridge.id]: bridge } }));
    renderPage(NetworksPage);
    await screen.findAllByText('bridge');

    expect(selectAllCheckbox()).toBeDisabled();
  });

  it('shows the loading row and no empty state before the first snapshot', async () => {
    mockEngine(() => new Promise(() => {}));
    renderPage(ContainersPage);

    expect(
      await screen.findByText('Loading containers...')
    ).toBeInTheDocument();
    expect(screen.queryByText('No containers yet')).not.toBeInTheDocument();
  });
});
