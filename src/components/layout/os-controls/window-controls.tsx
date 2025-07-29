import { useWindowState } from './use-window-state';

interface WindowControlsProps {
  className?: string;
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

export const WindowControls: React.FC<WindowControlsProps> = ({
  className = '',
}) => {
  const { isMaximized, minimize, maximize, close } = useWindowState();

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
        className="bg-red-500 hover:bg-red-600 cursor-pointer"
      />
      <WindowButton
        onClick={handleMinimize}
        title="Minimize"
        className="bg-yellow-500 hover:bg-yellow-600 cursor-pointer"
      />
      <WindowButton
        onClick={handleMaximize}
        title={isMaximized ? 'Restore' : 'Maximize'}
        className="bg-green-500 hover:bg-green-600 cursor-pointer"
      />
    </div>
  );
};
