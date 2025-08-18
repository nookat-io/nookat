import { Separator } from '../../ui/separator';
import { AlertTriangle, Cpu, Package, Info } from 'lucide-react';
import { DockerInfo } from '../../../types/docker-info';
import { formatBytes } from '../../../utils/format';
import {
  StatCard,
  InfoItem,
  SectionHeader,
  CapacityBar,
  InfoBanner,
} from './components';

interface EngineStatusSectionProps {
  dockerInfo: DockerInfo | null;
}

const ContainerStatistics = ({ dockerInfo }: { dockerInfo: DockerInfo }) => (
  <div className="space-y-4">
    <SectionHeader icon={Package} title="Container Statistics" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        value={dockerInfo.containers_running || 0}
        label="Running"
        variant="blue"
      />
      <StatCard
        value={dockerInfo.containers_paused || 0}
        label="Paused"
        variant="yellow"
      />
      <StatCard
        value={dockerInfo.containers_stopped || 0}
        label="Stopped"
        variant="red"
      />
      <StatCard value={dockerInfo.images || 0} label="Images" variant="green" />
    </div>
  </div>
);

const SystemInformation = ({ dockerInfo }: { dockerInfo: DockerInfo }) => (
  <div className="space-y-4">
    <SectionHeader icon={Info} title="System Information" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <InfoItem label="Engine Version" value={dockerInfo.version} />
      <InfoItem label="API Version" value={dockerInfo.api_version} />
      <InfoItem label="Storage Driver" value={dockerInfo.driver} />
      <InfoItem label="Operating System" value={dockerInfo.operating_system} />
      <InfoItem label="Architecture" value={dockerInfo.architecture} />
      <InfoItem label="Kernel Version" value={dockerInfo.kernel_version} />
    </div>
  </div>
);

const SystemCapacity = ({ dockerInfo }: { dockerInfo: DockerInfo }) => (
  <div className="space-y-4">
    <SectionHeader icon={Cpu} title="System Capacity" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CapacityBar
        label="CPU Cores"
        value={dockerInfo.ncpu || 'Unknown'}
        description="Total available CPU cores"
      />
      <CapacityBar
        label="Memory"
        value={formatBytes(dockerInfo.mem_total || -1)}
        description="Total available system memory"
      />
    </div>
    <InfoBanner
      icon={Info}
      title="Note"
      message="This shows system capacity, not current utilization. Real-time resource usage statistics are not available through the Docker API."
      variant="info"
    />
  </div>
);

const WarningsSection = ({ warnings }: { warnings: string[] }) => (
  <div className="space-y-4">
    <SectionHeader
      icon={AlertTriangle}
      title="Warnings"
      className="text-amber-600 dark:text-amber-400"
    />
    <div className="space-y-2">
      {warnings.map((warning, index) => (
        <InfoBanner
          key={index}
          icon={AlertTriangle}
          title="Warning"
          message={warning}
          variant="warning"
        />
      ))}
    </div>
  </div>
);

export const EngineStatusSection = ({
  dockerInfo,
}: EngineStatusSectionProps) => {
  if (!dockerInfo) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">
          No engine information available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ContainerStatistics dockerInfo={dockerInfo} />

      <Separator />

      <SystemInformation dockerInfo={dockerInfo} />

      <Separator />

      <SystemCapacity dockerInfo={dockerInfo} />

      {dockerInfo.warnings && dockerInfo.warnings.length > 0 && (
        <>
          <Separator />
          <WarningsSection warnings={dockerInfo.warnings} />
        </>
      )}
    </div>
  );
};
