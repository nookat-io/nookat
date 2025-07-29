import { useWindowState } from './use-window-state';
import { useOSDetection } from './use-os-detection';
import { OS_STYLES, type OS } from './os-styles';

interface OSWindowControlsProps {
  className?: string;
  os?: OS;
}

interface WindowButtonProps {
  onClick: () => void;
  title: string;
  className: string;
  children?: React.ReactNode;
}

const WindowButton: React.FC<WindowButtonProps> = ({
  onClick,
  title,
  className,
  children,
}) => (
  <button
    className={`w-3 h-3 rounded-full transition-colors ${className}`}
    onClick={onClick}
    title={title}
    type="button"
  >
    {children}
  </button>
);

const getOSStyles = (os: OS) => {
  return OS_STYLES[os] || OS_STYLES.macos;
};

export const OSWindowControls: React.FC<OSWindowControlsProps> = ({
  className = '',
  os,
}) => {
  const { isMaximized, minimize, maximize, close } = useWindowState();
  const detectedOS = useOSDetection();
  const currentOS = os || detectedOS;
  const styles = getOSStyles(currentOS);

  const handleMinimize = () => {
    minimize();
  };

  const handleMaximize = () => {
    maximize();
  };

  const handleClose = () => {
    close();
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <WindowButton
        onClick={handleClose}
        title="Close"
        className={`${styles.close} cursor-pointer`}
      />
      <WindowButton
        onClick={handleMinimize}
        title="Minimize"
        className={`${styles.minimize} cursor-pointer`}
      />
      <WindowButton
        onClick={handleMaximize}
        title={isMaximized ? 'Restore' : 'Maximize'}
        className={`${styles.maximize} cursor-pointer`}
      />
    </div>
  );
};
