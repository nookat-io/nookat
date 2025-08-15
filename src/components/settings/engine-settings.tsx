import { useEngineStatus } from '../../hooks/use-engine-status';
import { EngineInstallation } from './engine-installation';

export function EngineSettings() {
  const { isChecking } = useEngineStatus();

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

  // Always render the merged component - it handles all states internally
  return <EngineInstallation />;
}
