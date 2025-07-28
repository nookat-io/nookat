import { OSWindowControls } from './os-window-controls';

interface WindowFrameProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const WindowTitleBar = () => {
  return (
    <div className="window-frame h-8 flex items-center justify-between px-4 bg-background border-b border-border/50">
      <OSWindowControls />

      <div className="flex-1 text-center select-none" data-tauri-drag-region>
        <span className="text-sm font-medium text-foreground/70 cursor-default select-none">
          Nookat
        </span>
      </div>

      <div className="w-12" />
    </div>
  );
};

export const WindowFrame: React.FC<WindowFrameProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`h-screen flex flex-col ${className}`}>
      <WindowTitleBar />

      <div className="flex flex-1 min-h-0">{children}</div>
    </div>
  );
};
