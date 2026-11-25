import { openUrl } from '@tauri-apps/plugin-opener';
import { toast } from 'sonner';
import { Port, PortTypeEnum } from './container-types';
import { errorMessage } from '../../utils/error-message';

interface PortMappingsProps {
  ports: Port[];
  maxVisible?: number;
}

const HTTPS_CONTAINER_PORTS = [443, 8443];

const WILDCARD_ADDRESSES = ['0.0.0.0', '::'];

const isPublished = (port: Port) => port.public_port !== undefined;

const isTcp = (port: Port) =>
  !port.port_type || port.port_type.toLowerCase() === PortTypeEnum.Tcp;

const opensInBrowser = (port: Port) => isPublished(port) && isTcp(port);

const scheme = (port: Port) =>
  HTTPS_CONTAINER_PORTS.includes(port.private_port) ? 'https' : 'http';

const hostPort = (port: Port) => port.public_port ?? port.private_port;

const reachableHost = (port: Port) =>
  !port.ip || WILDCARD_ADDRESSES.includes(port.ip) ? 'localhost' : port.ip;

const hostWithPort = (host: string, hostPort: number) =>
  host.includes(':') ? `[${host}]:${hostPort}` : `${host}:${hostPort}`;

const mappingKey = (port: Port) => {
  const protocol = port.port_type?.toLowerCase() || 'tcp';
  return isPublished(port)
    ? `${port.public_port}:${port.private_port}/${protocol}`
    : `${port.private_port}/${protocol}`;
};

const byHostPortThenContainerPort = (a: Port, b: Port) =>
  hostPort(a) - hostPort(b) || a.private_port - b.private_port;

function uniquePortMappings(ports: Port[]): Port[] {
  const portsByMapping = new Map<string, Port>();
  ports.forEach(port => {
    const key = mappingKey(port);
    if (!portsByMapping.has(key)) {
      portsByMapping.set(key, port);
    }
  });
  return Array.from(portsByMapping.values()).sort(byHostPortThenContainerPort);
}

const formatPortMapping = (port: Port) =>
  isPublished(port)
    ? `${port.public_port}:${port.private_port}`
    : `${port.private_port}`;

const formatFullPortMapping = (port: Port) => {
  const protocol = port.port_type?.toUpperCase() || 'TCP';
  return port.public_port === undefined
    ? `${port.private_port}/${protocol}`
    : `${hostWithPort(reachableHost(port), port.public_port)}:${port.private_port}/${protocol}`;
};

async function openPublishedPort(port: Port) {
  if (port.public_port === undefined || !isTcp(port)) {
    return;
  }

  const url = `${scheme(port)}://${hostWithPort(reachableHost(port), port.public_port)}`;

  try {
    await openUrl(url);
  } catch (error) {
    console.error('Failed to open port URL:', error);
    toast.error(`Failed to open ${url}: ${errorMessage(error)}`);
  }
}

export function PortMappings({ ports, maxVisible = 3 }: PortMappingsProps) {
  if (!ports || ports.length === 0) {
    return <></>;
  }

  const sortedPorts = uniquePortMappings(ports);
  const visiblePorts = sortedPorts.slice(0, maxVisible);
  const hiddenCount = sortedPorts.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visiblePorts.map((port, index) => {
        const clickable = opensInBrowser(port);
        return (
          <button
            key={index}
            onClick={() => openPublishedPort(port)}
            disabled={!clickable}
            className={`text-xs transition-colors ${
              clickable
                ? 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer hover:no-underline'
                : 'text-muted-foreground cursor-default'
            }`}
            title={
              clickable
                ? `Click to open ${formatFullPortMapping(port)}`
                : formatFullPortMapping(port)
            }
          >
            {formatPortMapping(port)}
          </button>
        );
      })}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground">
          ...and {hiddenCount} more
        </span>
      )}
    </div>
  );
}
