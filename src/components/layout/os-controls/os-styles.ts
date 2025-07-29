export const OS_STYLES = {
  macos: {
    close: 'bg-red-500 hover:bg-red-600',
    minimize: 'bg-yellow-500 hover:bg-yellow-600',
    maximize: 'bg-green-500 hover:bg-green-600',
    buttonSize: 'w-3 h-3',
    spacing: 'space-x-2',
  },
  windows: {
    close: 'bg-red-500 hover:bg-red-600',
    minimize: 'bg-yellow-500 hover:bg-yellow-600',
    maximize: 'bg-green-500 hover:bg-green-600',
    buttonSize: 'w-3 h-3',
    spacing: 'space-x-2',
  },
  linux: {
    close: 'bg-red-500 hover:bg-red-600',
    minimize: 'bg-yellow-500 hover:bg-yellow-600',
    maximize: 'bg-green-500 hover:bg-green-600',
    buttonSize: 'w-3 h-3',
    spacing: 'space-x-2',
  },
} as const;

export type OS = keyof typeof OS_STYLES;
