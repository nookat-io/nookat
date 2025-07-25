'use client';

import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Port } from '../data/container-data-provider';

interface PortMappingsProps {
  ports: Port[];
  maxVisible?: number;
}

export function PortMappings({ ports, maxVisible = 3 }: PortMappingsProps) {
  if (!ports || ports.length === 0) {
    return <span className="text-muted-foreground">No port mapping</span>;
  }

  // Create unique port mappings by converting to string format and using Set
  // Include protocol in deduplication to handle TCP/UDP on same port
  const uniquePortStrings = new Set<string>();
  const uniquePorts: Port[] = [];

  ports.forEach(port => {
    const hostPort = port.public_port ?? port.private_port;
    const containerPort = port.private_port;
    const protocol = port.port_type?.toLowerCase() || 'tcp';
    const portString =
      port.public_port !== undefined
        ? `${hostPort}:${containerPort}/${protocol}`
        : `${containerPort}/${protocol}`;

    if (!uniquePortStrings.has(portString)) {
      uniquePortStrings.add(portString);
      uniquePorts.push(port);
    }
  });

  // Sort unique ports by host port, then by container port for consistent ordering
  const sortedPorts = uniquePorts.sort((a, b) => {
    const aHostPort = a.public_port ?? a.private_port;
    const bHostPort = b.public_port ?? b.private_port;

    // First sort by host port
    if (aHostPort !== bHostPort) {
      return aHostPort - bHostPort;
    }

    // If host ports are equal, sort by container port
    return a.private_port - b.private_port;
  });

  const visiblePorts = sortedPorts.slice(0, maxVisible);
  const hiddenCount = sortedPorts.length - maxVisible;

  const formatPortMapping = (port: Port) => {
    const hostPort = port.public_port ?? port.private_port;
    const containerPort = port.private_port;

    // Handle case where public_port is not set (container-only port)
    if (port.public_port === undefined) {
      return `${containerPort}`;
    }

    return `${hostPort}:${containerPort}`;
  };

  const handlePortClick = async (port: Port) => {
    // Only make clickable if there's a public port mapping
    if (port.public_port === undefined) {
      return;
    }

    let hostIp = port.ip || 'localhost';
    // Replace 0.0.0.0 with localhost for better UX
    if (hostIp === '0.0.0.0') {
      hostIp = 'localhost';
    }
    const hostPort = port.public_port;

    // Determine protocol based on port number or use HTTP as fallback
    let protocol = 'http';
    if (hostPort === 443 || hostPort === 8443) {
      protocol = 'https';
    } else if (hostPort === 22) {
      protocol = 'ssh';
    } else if (hostPort === 21) {
      protocol = 'ftp';
    } else if (hostPort === 23) {
      protocol = 'telnet';
    }

    const url = `${protocol}://${hostIp}:${hostPort}`;

    // Open in default browser using Tauri opener plugin
    try {
      await invoke('open_url', { url });
    } catch (error) {
      console.error('Failed to open port URL:', error);
      toast.error(`Failed to open ${url}: ${error}`);
    }
  };

  const isPortClickable = (port: Port) => {
    return port.public_port !== undefined;
  };

  const getFullPortMapping = (port: Port) => {
    let hostIp = port.ip || 'localhost';
    // Replace 0.0.0.0 with localhost for better UX
    if (hostIp === '0.0.0.0') {
      hostIp = 'localhost';
    }
    const hostPort = port.public_port ?? port.private_port;
    const containerPort = port.private_port;
    const protocol = port.port_type?.toUpperCase() || 'TCP';

    if (port.public_port === undefined) {
      return `${containerPort}/${protocol}`;
    }

    return `${hostIp}:${hostPort}:${containerPort}/${protocol}`;
  };

  return (
    <div className="flex flex-wrap gap-1">
      {visiblePorts.map((port, index) => {
        const clickable = isPortClickable(port);
        return (
          <button
            key={index}
            onClick={() => handlePortClick(port)}
            disabled={!clickable}
            className={`text-xs transition-colors ${
              clickable
                ? 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer hover:no-underline'
                : 'text-muted-foreground cursor-default'
            }`}
            title={
              clickable
                ? `Click to open ${getFullPortMapping(port)}`
                : getFullPortMapping(port)
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
