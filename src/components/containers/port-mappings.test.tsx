import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { describe, expect, it, vi } from 'vitest';
import { Port, PortTypeEnum } from './container-types';
import { PortMappings } from './port-mappings';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

function recordOpenedUrls(open: () => Promise<void> = async () => {}) {
  const urls: string[] = [];
  mockIPC((cmd, args) => {
    if (cmd === 'plugin:opener|open_url') {
      urls.push((args as { url: string }).url);
      return open();
    }
    throw new Error(`Unexpected command ${cmd}`);
  });
  return urls;
}

const tcpPort = (port: Omit<Port, 'port_type'>): Port => ({
  ...port,
  port_type: PortTypeEnum.Tcp,
});

async function clickPort(ports: Port[], name: string) {
  const urls = recordOpenedUrls();
  render(<PortMappings ports={ports} />);
  await userEvent.click(screen.getByRole('button', { name }));
  await waitFor(() => expect(urls).toHaveLength(1));
  return urls[0];
}

describe('PortMappings', () => {
  it.each(['0.0.0.0', '::'])(
    'opens a port published on every interface at localhost (%s)',
    async ip => {
      const url = await clickPort(
        [tcpPort({ ip, private_port: 80, public_port: 8080 })],
        '8080:80'
      );
      expect(url).toBe('http://localhost:8080');
    }
  );

  it('puts an IPv6 address in brackets', async () => {
    const urls = recordOpenedUrls();
    render(
      <PortMappings
        ports={[tcpPort({ ip: '::1', private_port: 80, public_port: 8080 })]}
      />
    );
    const button = screen.getByRole('button', { name: '8080:80' });
    expect(button).toHaveAttribute('title', 'Click to open [::1]:8080:80/TCP');

    await userEvent.click(button);

    await waitFor(() => expect(urls).toEqual(['http://[::1]:8080']));
  });

  it.each([
    { privatePort: 443, publicPort: 9443 },
    { privatePort: 8443, publicPort: 9000 },
  ])(
    'picks https from the container port ($publicPort:$privatePort)',
    async ({ privatePort, publicPort }) => {
      const url = await clickPort(
        [
          tcpPort({
            ip: '0.0.0.0',
            private_port: privatePort,
            public_port: publicPort,
          }),
        ],
        `${publicPort}:${privatePort}`
      );
      expect(url).toBe(`https://localhost:${publicPort}`);
    }
  );

  it('picks http when only the host port is 8443', async () => {
    const url = await clickPort(
      [tcpPort({ ip: '0.0.0.0', private_port: 80, public_port: 8443 })],
      '8443:80'
    );
    expect(url).toBe('http://localhost:8443');
  });

  it.each([21, 22, 23])('opens only web schemes (port %i)', async port => {
    const url = await clickPort(
      [tcpPort({ ip: '0.0.0.0', private_port: port, public_port: port })],
      `${port}:${port}`
    );
    expect(url).toBe(`http://localhost:${port}`);
  });

  it.each([undefined, PortTypeEnum.Empty])(
    'treats a port without a protocol as TCP (%j)',
    async portType => {
      const url = await clickPort(
        [
          {
            ip: '0.0.0.0',
            private_port: 80,
            public_port: 8080,
            port_type: portType,
          },
        ],
        '8080:80'
      );
      expect(url).toBe('http://localhost:8080');
    }
  );

  it.each([PortTypeEnum.Udp, PortTypeEnum.Sctp])(
    'shows a %s port as text, not as a link',
    async portType => {
      const urls = recordOpenedUrls();
      render(
        <PortMappings
          ports={[
            {
              ip: '0.0.0.0',
              private_port: 53,
              public_port: 5353,
              port_type: portType,
            },
          ]}
        />
      );
      const button = screen.getByRole('button', { name: '5353:53' });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute(
        'title',
        `localhost:5353:53/${portType.toUpperCase()}`
      );

      await userEvent.click(button);

      expect(urls).toEqual([]);
    }
  );

  it('shows why a port could not be opened', async () => {
    recordOpenedUrls(() => Promise.reject('No browser found'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <PortMappings
        ports={[
          tcpPort({ ip: '0.0.0.0', private_port: 80, public_port: 8080 }),
        ]}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: '8080:80' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to open http://localhost:8080: No browser found'
      )
    );
  });
});
