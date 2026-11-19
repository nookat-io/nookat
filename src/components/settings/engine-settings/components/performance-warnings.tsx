import { AlertTriangle } from 'lucide-react';
import { ColimaHost, ColimaPerformanceWarning } from '../types';
import { InfoBanner } from './info-banner';

interface PerformanceWarningsProps {
  warnings: ColimaPerformanceWarning[];
  host: ColimaHost;
}

const cpuCores = (count: number) =>
  count === 1 ? '1 CPU core' : `${count} CPU cores`;

function describe(warning: ColimaPerformanceWarning, host: ColimaHost) {
  switch (warning.kind) {
    case 'FewCpus':
      return {
        title: `The engine runs on only ${cpuCores(warning.cpus)}`,
        message: `Builds and parallel workloads run up to 3x slower than with all ${host.cpus} cores. Stop the engine, raise CPU Cores and start it again.`,
      };
    case 'RosettaOff':
      return {
        title: 'Rosetta is off',
        message:
          'amd64 images run under QEMU emulation and are about 2x slower. Stop the engine and start it again from Nookat to turn Rosetta on.',
      };
  }
}

export function PerformanceWarnings({
  warnings,
  host,
}: PerformanceWarningsProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {warnings.map(warning => {
        const { title, message } = describe(warning, host);
        return (
          <InfoBanner
            key={warning.kind}
            icon={AlertTriangle}
            title={title}
            message={message}
            variant="warning"
          />
        );
      })}
    </div>
  );
}
