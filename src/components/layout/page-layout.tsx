import { ReactNode } from 'react';

export interface PageLayoutProps {
  header: ReactNode;
  controls: ReactNode;
  table: ReactNode;
}

export function PageLayout({ header, controls, table }: PageLayoutProps) {
  return (
    <div className="page-background min-h-screen flex flex-col">
      {/* Sticky header section */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="space-y-6 p-6 max-w-full">
          {header}
          {controls}
        </div>
      </div>

      {/* Scrollable table section */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6 max-w-full h-full overflow-auto">{table}</div>
      </div>
    </div>
  );
}
