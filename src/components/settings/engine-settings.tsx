import { useEngineStatus } from '../../hooks/use-engine-status';
import { EngineStatus } from './engine-status';
import { EngineInstallation } from './engine-installation';

export function EngineSettings() {
  const { status, isChecking } = useEngineStatus();

  // Show loading state while checking engine status
  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">
          Checking engine status...
        </div>
      </div>
    );
  }

  // If engine is running or installed, show the status
  if (
    typeof status === 'object' &&
    ('Running' in status || 'Installed' in status)
  ) {
    return <EngineStatus />;
  }

  // If no engine is available, show the installation component
  return <EngineInstallation />;
}
