import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkCreateDialog } from './network-create-dialog';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const POOL_OVERLAP =
  'Failed to create network nookat-e2e-web: invalid pool request: Pool overlaps with other one on this address space';

function mockCreateNetwork(respond: () => unknown) {
  const requests: unknown[] = [];
  mockIPC((cmd, args) => {
    if (cmd !== 'create_network') {
      throw new Error(`Unexpected command ${cmd}`);
    }
    requests.push(args);
    return respond();
  });
  return requests;
}

async function openDialog() {
  const user = userEvent.setup();
  render(<NetworkCreateDialog existingNetworkNames={['bridge', 'backend']} />);
  await user.click(screen.getByRole('button', { name: 'Create Network' }));
  return user;
}

const dialog = () => screen.getByRole('dialog', { name: 'Create Network' });
const addressing = (family: 'IPv4' | 'IPv6') =>
  within(screen.getByRole('group', { name: `${family} addressing` }));

describe('NetworkCreateDialog', () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('creates a bridge network from just a name, confirms it and starts fresh next time', async () => {
    const requests = mockCreateNetwork(() => null);
    const user = await openDialog();

    await user.type(screen.getByLabelText('Name'), 'nookat-e2e-web');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(requests).toEqual([
      {
        options: {
          name: 'nookat-e2e-web',
          driver: 'bridge',
          internal: false,
          attachable: false,
          ipv4: { enabled: true },
          ipv6: { enabled: false },
          labels: [],
        },
      },
    ]);
    expect(toast.success).toHaveBeenCalledWith(
      'Created network "nookat-e2e-web"'
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: 'Create Network' }));
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('sends every option the form collects', async () => {
    const requests = mockCreateNetwork(() => null);
    const user = await openDialog();

    await user.type(screen.getByLabelText('Name'), 'nookat-e2e-full');
    await user.click(screen.getByRole('switch', { name: 'Internal' }));
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.type(
      addressing('IPv4').getByLabelText('Subnet'),
      '10.213.50.0/24'
    );
    await user.type(
      addressing('IPv4').getByLabelText('Gateway'),
      '10.213.50.1'
    );
    await user.type(
      addressing('IPv4').getByLabelText('IP range'),
      '10.213.50.128/25'
    );
    await user.click(screen.getByRole('switch', { name: 'IPv6' }));
    await user.type(
      addressing('IPv6').getByLabelText('Subnet'),
      'fd00:e2e::/64'
    );
    await user.click(screen.getByRole('switch', { name: 'Attachable' }));
    await user.click(screen.getByRole('button', { name: 'Add label' }));
    await user.type(screen.getByLabelText('Label key'), 'io.nookat.e2e');
    await user.type(screen.getByLabelText('Label value'), 'create-network');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(requests).toEqual([
      {
        options: {
          name: 'nookat-e2e-full',
          driver: 'bridge',
          internal: true,
          attachable: true,
          ipv4: {
            enabled: true,
            subnet: '10.213.50.0/24',
            gateway: '10.213.50.1',
            ip_range: '10.213.50.128/25',
          },
          ipv6: { enabled: true, subnet: 'fd00:e2e::/64' },
          labels: [{ key: 'io.nookat.e2e', value: 'create-network' }],
        },
      },
    ]);
  });

  it('asks for the parent interface of a macvlan network and sends it', async () => {
    const requests = mockCreateNetwork(() => null);
    const user = await openDialog();

    expect(screen.queryByLabelText('Parent interface')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'nookat-e2e-lan');
    screen.getByRole('combobox', { name: 'Driver' }).focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('option', { name: /macvlan/ }));
    await user.type(screen.getByLabelText('Parent interface'), 'eth0');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(requests).toEqual([
      {
        options: expect.objectContaining({
          driver: 'macvlan',
          parent_interface: 'eth0',
        }),
      },
    ]);
  });

  it('explains what is wrong instead of sending an invalid network', async () => {
    const requests = mockCreateNetwork(() => null);
    const user = await openDialog();

    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('Network name is required')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'backend');
    expect(
      screen.getByText('A network named "backend" already exists')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.type(
      addressing('IPv4').getByLabelText('Subnet'),
      '172.20.0.1/16'
    );
    await user.type(addressing('IPv4').getByLabelText('Gateway'), '172.21.0.1');
    await user.click(screen.getByRole('switch', { name: 'IPv4' }));
    expect(screen.getByText('Enable IPv4, IPv6 or both')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'IPv4' }));

    expect(
      addressing('IPv4').getByText(
        'IPv4 subnet has host bits set; use 172.20.0.0/16'
      )
    ).toBeInTheDocument();
    expect(
      addressing('IPv4').getByLabelText('Subnet')
    ).toHaveAccessibleDescription(
      'IPv4 subnet has host bits set; use 172.20.0.0/16'
    );

    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(requests).toEqual([]);
  });

  it('waits until a field is left before judging what is typed into it', async () => {
    mockCreateNetwork(() => null);
    const user = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Advanced' }));

    await user.type(addressing('IPv4').getByLabelText('Subnet'), '172.20');
    expect(
      addressing('IPv4').queryByText(/CIDR block/)
    ).not.toBeInTheDocument();

    await user.tab();
    expect(
      addressing('IPv4').getByText(
        'IPv4 subnet must be an IPv4 CIDR block, like 172.20.0.0/16'
      )
    ).toBeInTheDocument();
  });

  it('opens the advanced options when a mistake there blocks creating the network', async () => {
    const requests = mockCreateNetwork(() => null);
    const user = await openDialog();

    await user.type(screen.getByLabelText('Name'), 'nookat-e2e-web');
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.click(screen.getByRole('button', { name: 'Add label' }));
    await user.type(screen.getByLabelText('Label value'), 'orphan');
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText('Label key is required')).toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it('shows why Docker refused the network and keeps the form to fix it', async () => {
    mockCreateNetwork(() => Promise.reject(POOL_OVERLAP));
    const user = await openDialog();

    await user.type(screen.getByLabelText('Name'), 'nookat-e2e-web');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(toast.error).toHaveBeenCalledWith(POOL_OVERLAP);
    expect(toast.success).not.toHaveBeenCalled();
    expect(dialog()).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('nookat-e2e-web');
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });
});
