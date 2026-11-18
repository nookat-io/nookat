import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Port } from './container-types';
import { errorMessage } from '../../utils/error-message';

interface PortMappingsProps {
  ports: Port[];
  maxVisible?: number;
}

const URL_SCHEME_BY_WELL_KNOWN_PORT: Record<number, string> = {
  21: 'ftp',
  22: 'ssh',
  23: 'telnet',
  443: 'https',
  8443: 'https',
};

const WILDCARD_ADDRESSES = ['0.0.0.0', '::'];

const isPublished = (port: Port) => port.public_port !== undefined;

const hostPort = (port: Port) => port.public_port ?? port.private_port;

const reachableHost = (port: Port) =>
  !port.ip || WILDCARD_ADDRESSES.includes(port.ip) ? 'localhost' : port.ip;

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
  return isPublished(port)
    ? `${reachableHost(port)}:${port.public_port}:${port.private_port}/${protocol}`
    : `${port.private_port}/${protocol}`;
};

async function openPublishedPort(port: Port) {
  if (port.public_port === undefined) {
    return;
  }

  const scheme = URL_SCHEME_BY_WELL_KNOWN_PORT[port.public_port] ?? 'http';
  const url = `${scheme}://${reachableHost(port)}:${port.public_port}`;

  try {
    await invoke('open_url', { url });
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
        const clickable = isPublished(port);
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
